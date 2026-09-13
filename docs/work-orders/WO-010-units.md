# WO-010 — Load in the unit it is built in: bar + plates, kg or lb, kg total per set

Written 2026-09-12 by `project-manager` against `main @ f555322`. One branch, `wo-010-units`.
**Status: closed 2026-09-12** — on `main` @ `9f06d98`, §3.5 amended on `11c44ff`, deployed and byte-verified;
suite 802 / 802 / 0. The closure record is §9; the sections below are as written, so the criteria can be read against
the evidence. Written on the day the standing diagnosis moved: **the first session was logged
today**, and this ask comes from lifting with it. Everything below is judged against that session
staying byte-identical.

---

## 0. Ask

Let a set's weight be entered as **bar (kg or lb) + added weight (kg or lb)**, show the **kg total on
every set row**, and store the kg total as the number every engine reads — without the app policing
which exercise gets which entry, and with added weight entered as a **total**, not per side.

Chady, verbatim: *"the bar for the barbell is in kilograms. And all the weights at the gym are in LB,
and all the cable machines are in kilogram. So for all the exercises, there need to be a barbell
weight, and you can pick if it's in kilogram or LB. And the actual added weight, which you also can
pick if it's LB or kilogram, and eventually you transform everything to kilogram, as a label for me
to see how many kilograms I lifted. I need to see that per set."* And: *"I can do total, which I
think is better. But I don't want you to split those [by exercise type]. Sometimes even if the
exercise says barbell and I don't find any barbell at the gym because they're all occupied, I tend to
replace the exercise with some other exercise."*

**Settled by him, not open:** added weight is a **total**. **No gating by `implement`** — every card
offers the same entry, whatever the slot nominally is.

## 0.1 Reading of it

- **`w` stays the kg total.** Every engine — P1, H1, G1, Z2, ST1, SP1, D1, `vol`, `topSet`, `e1rm`,
  Trend — reads `w` in kg and is untouched by this order. The components are stored **beside** `w`,
  additive, in one optional object, so a set without them is exactly a set entered in kg — which is
  every set logged before this ships, including today's.
- **The unit and the bar are a property of how the load was built, not of the exercise.** That is
  the only reading consistent with "don't split by type" and with substitution. So the app never
  reads `implement` to decide what the row offers, and — this is the coaching half — the increment
  ladder the verdict speaks in must come from the set's components, not the slot's tag.
- **"Per set" means visible on the row without expanding anything.** The kg total renders on the
  set's own ghost line, in `--bone`, before the ghost text. Nothing to tap.
- **The common case is one number typed.** Unit and bar are chosen **per card** (all sets of an
  exercise share them — he does not change plate units between sets), remembered per exercise id
  from the last logged session, and stamped onto every set. First time on a card: kg direct, no bar,
  i.e. today's row. Second session onward: the card opens as he left it and he types the lb number.
- **A gym profile holds bars only.** Name + weight + unit, set once in Settings. The three unit
  defaults the ask floated (plate / machine / dumbbell unit) are dropped: their only use would be an
  `implement`-keyed default, which is the split he refused, and history memory gives the same tap
  saving from the second session without ever inventing a bar he did not lift. Per device, in
  `phat:v1:prefs` — reasons in §0.2.
- **Substitution is not marked in this order.** Question 3 goes to the coach for the trade-off;
  Chady decides; nothing is built until he does (B-111).
- **CLAUDE.md §3.5 reads "Units are kg, steps of 2.5 kg for weight."** Entry in lb and a 5 lb step
  contradict it literally. The nearest thing that keeps the constraint's point: **stored** units are
  kg, always, one number per set; **entry** may be in lb, converted once at the total; the stepper
  steps in the entry unit. He has already chosen this; the closure amends §3.5's wording, not its
  intent (§5 #4).

## 0.2 Constraint & backlog check

| | |
|---|---|
| §3.1 no build step | Nothing new loads. Conversion is arithmetic in `logic.js` |
| §3.2 offline-first | The profile and the conversion are local. No network on any path |
| §3.3 never lose a number | **This is the first change to the set shape since the app held real data.** Two live drop paths today for any key beside `w`: `validateEntry` emits `{w, r}` only; `hydrateDraft` rebuilds `{w, r}` on reload. Both are closed here (W3, W6) and pinned (W7) **before** any row can produce a component. His logged session is pinned by id |
| §3.4 local dates | Untouched |
| §3.5 kg, 2.5 kg steps | **Conflicts literally, resolved as above.** Storage kg; entry unit free; step in the entry unit. His decision; recorded in `decisions.md` |
| §3.6 44 px | The unit/bar chip, the sheet's options, the Settings bar rows are all ≥ 44 px. The kg total is text, not a control |
| §3.7 secrets | None. The SQL change is applied through the dashboard as before |
| §3.8 `main` deploys | Branch `wo-010-units`; SQL applied before merge (§3) |
| Per device vs per account | **Per device.** (1) WO-008 ruled two phones = two people, so per device *is* per person; (2) the gym is a property of where the phone goes, and Diana's gym may differ; (3) `prefs` is the store that already holds settings-shaped data and is never pushed, so `log_meta`, the SQL validator and the backup carry nothing new for it; (4) the log is **self-describing** — every set stores its own components — so no engine and no history ever depends on the profile existing. Cost: a replaced phone retypes two or three bars (B-113). The flip to `log_meta` is one key move if he wants it |
| Backlog | B-10 (plate math) is adjacent, not built: this order gives the engine the components it would need. B-22's `· per DB` display stands. B-58's ruling ("the increment is the rule's, not a setting's") stands and is the reason the ladder goes to the coach, not to Settings. B-05 (edit/delete a session) is still open and is the general remedy for a wrong number — say so when question 3 comes up |
| Blocking P0s | None open. B-112 is filed by this order and closed inside it |

## 0.3 Source facts, from the tree not from memory

- `validateEntry` (`logic.js:341`) → `{w, r}` per complete set, nothing else survives. `buildSession`
  (`logic.js:479`) adds `rx` per entry and reads sets from `validateDraft` only. `validateSessionDoc`
  (`logic.js:2790`) and `phat_validate_session_doc` (`schema.sql:111`) check `w`/`r` and **ignore
  unknown set keys**.
- `hydrateDraft` (`index.html:5357`) → `sets: [{w: String, r: String}]`. `syncSet`/`commitField`
  write `st[f]` for `f ∈ {w, r}`. `stepValue` (`index.html:4678`) steps 2.5 kg; aria-labels hardcode
  `Weight up 2.5` (`index.html:2249/2251`). The ghost line is its own full-width row (B-37).
- `SCHEMA_VERSION = 5`, passes gated on `V_DATEBASIS/V_STATEKEYS/V_PLAN/V_RX`. The v5 pass writes
  the version and nothing else. The importer owes 2–5.
- The 2.5 kg lattice lives in: `round2p5` (3534), `g1Step` (3735 — floor 2.5, cap rounded),
  `incOf` (3762 — default 2.5, reads an `ex.inc` nothing sets), `incrementLine` (3699 — the copy
  says `2.5 kg` / `2.5 kg per DB`), `tooHeavy` (4153 — `round2p5(w0 * 0.95)`), H1.4d copy (4350 —
  `Add a rep or 2.5 kg`), `speedLoad` (5675–5677 — target/lo/hi), `DEMO_STEP` (7892) and the demo
  block-start load (7985, 8126), `stepValue` and the two aria-labels in `index.html`. ST1's 2.5 **%**
  is a percentage, not a lattice — not affected; do not "fix" it.
- `phat:v1:prefs` exists, per device, never pushed, never restored.
- 1 lb = 0.45359237 kg. 90 lb = 40.823 kg; 20 kg bar + 90 lb = 60.823 → **60.8**. 5 lb = 2.268 kg;
  2.5 lb = 1.134 kg; 45 lb = 20.412 kg; 135 lb = 61.235 kg.

---

## 1. The shape, ruled here so three owners build the same thing

**A set, saved:** `{w: 60.8, r: 5, ld: {bar: 20, bu: "kg", add: 90, au: "lb"}}`.
**A set entered in kg with no bar, saved:** `{w: 60, r: 5}` — **unchanged from today, byte for byte.**

- `ld` is **one optional object**, not four flat keys, so presence is atomic: either the whole
  breakdown is there and valid, or the key is absent. `ld` absent **means** entered in kg — true of
  every set logged before v6.
- Inside `ld`: `add` (required, number ≥ 0) and `au` (required, `"kg"|"lb"`); `bar` (number > 0) and
  `bu` (`"kg"|"lb"`) **both present or both absent**. Nothing else. Strings while drafting, numbers
  once saved, as `w` and `r` are.
- **`w` is always the kg total, rounded to 0.1 kg, once, at the total** — never per component:
  `w = r1(kg(bar, bu) + kg(add, au))`. 0.1 because every load token the app prints already goes
  through `r1` (`kg()`, `loadWord`, the ghost), so the number stored is the number displayed, which is
  criterion D2; 0.05 would store what the screen rounds away. No two distinct lb loads collide at
  0.1 kg (the smallest lb step, 2.5 lb, is 1.13 kg). Sets built from the same plates always produce
  the same `w`, so `repeatLoad`/`minW`/`mixed` compare equal exactly.
- **`w` and `ld` must agree.** `validateEntry` recomputes the total from `ld` and a disagreement
  beyond 0.05 kg is `malformed` (blocks the save, names the row) — never silently rewritten in
  either direction. The SQL validator applies the same test.
- **Ranges.** `w` stays 0–500 kg. `add` in its own unit: 0–500 kg or 0–1100 lb. `bar` 0 < bar ≤ 50 kg
  / 110 lb. All in one `LIMITS` table in `logic.js` so the SQL mirror has one thing to copy.
- **Schema 6, gated on `V_LD = 6`.** The pass stamps the version and moves zero bytes — the v4/v5
  shape. The importer owes **2, 3, 4, 5 and 6**. It is a bump for the same reason v4 and v5 were: the
  store must not understate its shape to the importer and to sync.
- **Stepper on an off-lattice value never snaps.** `+` on 60.8 in kg mode gives 63.3 (today's
  `r1(n + 2.5)` already does this). In `ld` mode the stepper acts on `add` in its unit: **5 lb** or
  **2.5 kg** per tap. Snapping would change a number he typed.
- **The profile**, `prefs.gym = {bars: [{n: "Barbell", w: 20, u: "kg"}, …]}`. Not in the log, not
  in the backup, not pushed.
- **Per-card mode.** `PHAT.loadModeFor(prevEntry)` → `{au, bar, bu}` from the last logged entry's
  first set with `ld`, else `{au: "kg"}`. The draft's own `ld` wins while a draft is open.

---

## 2. Work order

### W1 · The coaching rules for a mixed-unit gym — owner: `strength-coach`

**Scope.** Rule on the four questions below, as addendum **§18**, in the register the code can
transcribe (rule blocks, output copy, worked examples with a failing case). Read `docs/coach-audit.md`
§3 (P1) and the addendum's I2 and Z2 sections first; this order's §1 fixes the data shape and is not
open to the coach — the *ladder* and the *sentence* are.

**The questions, exact.**

1. **The increment ladder.** Rule P1 cases 3/4 (`Go to {load + 2.5}`), G1's floor and cap, P1 case 1's
   `round2.5(w0 × 0.95)`, Rule I2's fallback and SP1's `round2p5` of the 65–70% band all assume a 2.5 kg
   step exists. In a lb-plate gym the smallest total steps are 2.27 kg (2.5 lb/side) and 4.54 kg
   (5 lb/side); a dumbbell rack in lb steps 5 lb. **What is the ladder per way-of-building-the-load
   (kg direct · lb plates on a bar · lb dumbbell · lb added to bodyweight), and what does the verdict
   say?** A kg figure that cannot be built is a wrong instruction. PM's proposal to accept or strike:
   the step is chosen in the unit the last set was built in, the target is rounded in that unit, and
   the sentence prints the kg total **and** the build: `Top of range on all 3 sets. Go to 83.5 kg next
   session — 20 kg bar + 140 lb.` (from 20 kg + 135 lb = 81.2). Same for `Drop to` and SP1's target.
   State the rounding (nearest, ties down?) in the entry unit, and whether Decision 4 ("no rule prints
   an off-grid kg") is restated as "off-grid in the unit the load was built in".
2. **Z2 and I2's source.** `loadWord` and `incrementLine` key on `ex.implement`. With substitution
   unpoliced, the slot's tag may not match what he lifted. **Do they read the slot, the set's `ld`, or
   both — and which wins?** Note I2's own premise ("a barbell makes 2.5 kg with a 1.25 kg plate per
   side") is false in his gym: the smallest bar step is 5 lb. Say what I2 prints, if anything, for a
   lb-built set on a `bb` slot.
3. **Substitution and the engines.** A barbell row one week and a machine row the next are both
   `d1a`. ST1 compares top-set e1RM on the id across two 21-day blocks; P1/H1 compare against the last
   session's sets on the id. **Should a set be markable as a substitution (one tap, `sub: true`) so ST1
   drops it and P1/H1 read the last *unsubstituted* session — or does the app read history as-is and
   he interprets?** State the trade-off in both directions (a mark is a tap mid-set and a claim the
   app then acts on; no mark means one machine week can print `Sets not matched` against a barbell
   load or manufacture a stall). Recommend; **do not rule** — Chady decides, and nothing is built
   until he does. Note B-05 (edit a saved session) is the general remedy and is still open.
4. **Bodyweight-implement slots with lb added.** Rack chin, dip, weighted pull-up with a 45 lb plate:
   `w = 20.4`. Z2 today prints `20.4 kg`; the honest build is `bodyweight + 45 lb`. What does each P1
   case print, and what is the step (Q1's bodyweight ladder)?

Also confirm or strike: rounding the total to 0.1 kg (§1); the stepper's 5 lb / 2.5 kg taps.

**Acceptance criteria.**
- Each of the four questions has a rule block, output copy for every P1/H1 case it touches, and at
  least one **failing** worked example (an instruction that must *not* print).
- Every kg figure in every example is buildable from the components in that example, and the
  example says which plates.
- Q3 ends with a recommendation and a one-line trade-off Chady can answer yes/no to.
- A table "what changes, by work item" naming which of the nine lattice sites in §0.3 move and which
  stay.

**Depends on:** —

### W2 · Row, card, sheet, Settings — owner: `ux-designer`

**Scope.** Spec, as `wo-004-screens.md` §4.4a (set row in `ld` mode), §4.4b (the card's load
chip and sheet) and a Settings §12.x (Gym → Bars), in the states-and-copy register with a control
inventory row for every new control. Bound by this order's §1 and by Chady's two settled points.
Constraints that are not yours to relax: the kg total is visible per set without a tap; the row's
geometry does not change between kg and `ld` mode (a row that rewraps when he switches units is a
worse bug than either unit); nothing appears or resizes above an input; verdicts still evaluate on
commit.

**PM's one recommendation, to refine not replace.**
- **Row, kg mode:** unchanged from today. Zero regression for a cable exercise.
- **Row, `ld` mode:** the weight input binds to `add`; its caption reads `LB` (or `+ KG` when a bar
  is set in kg mode); steppers `± 5 lb` / `± 2.5 kg`; placeholder `0`. **The ghost line leads with
  the total**: `= 60.8 kg` in `--bone`, then the ghost in the entry unit: `Last 90 lb × 5`
  (bar unchanged → not repeated) or `Last 20 kg + 90 lb = 60.8 × 5` when the bar differs from the
  card's current bar; `EXTRA` stays right-aligned. Budget the string at 366 px.
- **Card:** one chip under the target line, 44 px, reading `kg` today and `lb · bar 20 kg` once
  set. Tap → a sheet: `Entered in  [kg] [lb]` and `Bar  [None] [Barbell 20 kg] [EZ bar 10 kg]
  [Other…]`, bars from the profile. Applies to every set on the card; a set already holding a
  number is **re-expressed, never re-valued** — switching kg→lb with `60` typed asks, it does not
  convert silently.
- **First `+` on an empty field** adopts last session's `add` only when that set's `au` matches;
  otherwise the step. Reps never seeded (§4.4 unchanged).
- **Live region:** `Weight now 90 lb, 60.8 kg.`
- **Settings → Gym:** a list of bars, `name · weight · unit`, add/remove, 44 px rows, weight
  stepper 2.5 kg / 5 lb. Copy: `Bars in your gym. Pick one per exercise from the card.` No unit
  defaults, no per-implement anything.

**Acceptance criteria.**
- Every string tabled with the same case grammar as §4.4 (history / no history / refusal / EXTRA)
  for both modes.
- A refusal on a `ld` row names the token he typed in the unit he typed it (`! 7.5.0` never
  `! 3.4`).
- Switching a card's unit with numbers typed has a specified outcome that never changes `w`
  silently.
- Control inventory rows added to §0.4.1 for the chip, the sheet's options and the Settings rows.
- Measured budget: the ghost line's longest string fits at 400 px in Archivo without wrapping.

**Depends on:** — (parallel with W1; W1's copy for the verdict is the coach's, not the spec's)

### W3 · The set shape, the validators, schema 6 — owner: `backend-engineer`

**Scope.** In `logic.js`, pure, tested:
- `PHAT.LB_KG = 0.45359237`, `PHAT.toKg(v, unit)`, `PHAT.composeLoad(ld)` → `{ok, w, reason,
  field}` (the kg total per §1, or the first bad field named), `PHAT.loadModeFor(prevEntry)`.
- `describeSet`/`validateEntry`: a set carrying `ld` is validated per §1 and emitted as `{w, r, ld}`
  with numbers; a `w`/`ld` disagreement is `malformed` with `field: "ld"` and the token he typed; a
  blank row that carries an `ld` with empty `add` is **blank** (skipped silently, as today). A set
  without `ld` is emitted as `{w, r}` — the JSON string is unchanged.
- `validateSessionDoc` and `backupPayload`: accept `ld` per §1; refuse `au: "kilo"`, `bar` without
  `bu`, a negative `add`, a disagreeing `w`, each with a message naming the entry and the field.
- Schema 6: `V_LD = 6`, a pass that writes the version and nothing else; `restorePayload`/importer
  accepts 2–6; the importer note lists 6.
- `LIMITS` in one table (§1) with a comment that `schema.sql` copies it.
- Ghost/verdict helpers the frontend and W4 need: `PHAT.buildWord(ld)` → `20 kg bar + 90 lb` (the
  build in his units, for the ghost and, if W1 says so, the verdict).
- **Out:** any verdict, ladder or rounding-in-lb change (W4). Any DOM. The profile's shape beyond
  a `PHAT.validateGymProfile` that refuses a bar without a name, a weight outside range or a unit
  outside `{kg, lb}`.

**Acceptance criteria.**
- D1–D9 below, engine half.
- `composeLoad({bar: 20, bu: "kg", add: 90, au: "lb"})` → `{ok: true, w: 60.8}`;
  `{add: 45, au: "lb"}` → `20.4`; `{bar: 45, bu: "lb", add: 90, au: "lb"}` → `61.2`;
  `{add: "7.5.0", au: "lb"}` → `{ok: false, reason: "malformed", field: "add"}`;
  `{add: 90}` → `{ok: false, field: "au"}`; `{bar: 20, add: 90, au: "lb"}` → `{ok: false, field: "bu"}`.
- `validateEntry([{w: "60.8", r: "5", ld: {…60.8…}}])` emits `ld` with numbers;
  `[{w: "61", r: "5", ld: {…60.8…}}]` is one `malformed` problem on `field: "ld"`, nothing emitted.
- `JSON.stringify(validateEntry([{w: "100", r: "5"}]).sets[0])` is `{"w":100,"r":5}` — asserted
  against the literal.
- A v5 store migrates to 6 with one note and zero session bytes changed; a v6 store boots with zero
  writes; every earlier pass still gates on its own constant (the `dateBasis:"local"` assertion from
  the v4 test re-run at 6).
- Suite moves only by the tests added; zero red.

**Depends on:** — (parallel with W1/W2)

### W4 · The ladder and the verdict copy — owner: `backend-engineer`

**Scope.** Transcribe addendum §18 (W1) into `logic.js`: the increment ladder from the set's
components, the target rounded in the entry unit, `tooHeavy`, `g1Step`, `incOf`/`ex.inc`,
`incrementLine`, `loadWord`, H1.4d's copy, `speedLoad`'s band — **exactly the sites §18's "what
changes" table names, no others.** Sentences are the coach's literals. Anything §18 leaves silent
stays as it is.

**Acceptance criteria.**
- Every worked example in §18 reproduced as a test, including each failing case.
- Every existing verdict test on a kg-direct set (no `ld`) passes **unchanged** — the kg gym is the
  regression baseline and it is today's suite.
- No rule can print a kg figure that `composeLoad` cannot rebuild from the components it names —
  a meta-test parses every emitted `Go to`/`Drop to`/`Repeat` string from the §18 fixtures and
  recomputes it.
- Mutants: at least one per touched site, each killed.

**Depends on:** W1, W3.

### W5 · The SQL mirror — owner: `backend-engineer` (write) → `release-engineer` (apply)

**Scope.** `supabase/schema.sql`: `phat_validate_session_doc` validates `ld` per §1 with the same
messages as `validateSessionDoc` (`entry d2a set ld.au must be kg or lb`, `… ld.bar without ld.bu`,
`… w 61 disagrees with ld (60.8)`), tolerance 0.05. A `validator-selftest.sql` block with the six
`composeLoad` fixtures from W3 as session docs, each expected to land or to refuse with the named
message. `release-engineer` applies per `supabase/README.md` §1 (schema → rls → selftest) and records
the selftest output in the runbook.

**Order is free, and say so in the README:** today's SQL accepts unknown set keys, so a client that
writes `ld` before the SQL lands is not refused; a SQL that lands first refuses only malformed `ld`,
which no older client writes. Apply SQL **before** merging anyway, so the consistency check is live
when the first `ld` set is pushed.

**Acceptance criteria.**
- The selftest refuses the four bad fixtures with the named messages and lands the two good ones.
- A session doc with no `ld` lands exactly as before (re-push of his logged session: `sessions`
  row `doc` byte-identical, archive row count unchanged).
- The JS and SQL messages for the same fault are the same string, asserted by a `tests.html` test
  that reads the message table both files share (a comment block copied verbatim, checked by hand
  in W7).

**Depends on:** W3 (write). Applied before W8.

### W6 · Row, card, sheet, Settings, `hydrateDraft` — owner: `frontend-engineer`

**Scope.** Build W2 on `index.html`: the chip and sheet on the card; the row in `ld` mode; the
total on the ghost line; `stepValue` stepping in the entry unit; aria-labels naming the unit;
`hydrateDraft` carrying `ld` verbatim (**B-112 — do this first, with its criterion, before the row
can produce an `ld`**); `syncSet`/`commitField` writing `add` and recomputing `w` through
`PHAT.composeLoad` (on a malformed `add`, `w` mirrors the typed token so the refusal names it);
Settings → Gym reading and writing `prefs.gym` through `save()`; the card's mode from
`PHAT.loadModeFor(prev)` with the draft's own `ld` winning. Verdict/ghost strings come from
`logic.js`; nothing is composed in the view.
**Out:** any engine, any copy not in W2/§18, any per-implement default, a substitution mark.

**Acceptance criteria.**
- D3, D5, D6, D8 below.
- At 400 px: the row's height and the steppers' x-positions are identical in kg and `ld` mode,
  measured; the `= 60.8 kg` token is `--bone`, ≥ 0.875 rem, on screen with no tap; zero controls
  under 44 × 44 on Session and Settings; every new control named.
- The `+` on an empty `add` field with a matching-unit prior adopts it and announces
  `Weight now 90 lb, 60.8 kg.`; with a kg-direct prior it gives `5`.
- A kg-direct card (no history, no bar) renders the **same DOM as `main`** for the set rows — diffed.
- `phat:v1:prefs.gym` is the only key a Settings → Gym edit writes; `phat:v1:log`, `bw`, `draft`,
  `plans` byte-identical across it.

**Depends on:** W2, W3.

### W7 · QA — owner: `qa-engineer`

**Scope.** D1–D9, every W3/W4/W6 criterion, the meta-test in W4, and an attack pass on the two drop
paths this order exists beside: `validateEntry` and `hydrateDraft`. Pin his logged session (§5 #1)
as a fixture: migrate v5 → 6 and assert `JSON.stringify` equality on the session and on the whole
`sessions` array. Mutants: `composeLoad` rounding per component instead of at the total; `bu`
optional when `bar` is present; `hydrateDraft` dropping `ld`; SQL tolerance widened to 0.5. Each must
die. Last: a phone checklist of what only the phone answers (the chip one-handed, the sheet with
chalk, the total legible under gym light).

**Depends on:** W3–W6.

### W8 · Release — owner: `release-engineer`

**Scope.** W5's apply first and recorded. Merge `wo-010-units` to `main`, deploy, byte-verify the
file list on the production origin, `sw.js` header rule (file list unchanged → version unchanged;
otherwise bump). Fetch `/logic.js` and require `V_LD` in the body. Post-deploy: re-push of his
logged session leaves the `sessions` row byte-identical (W5's criterion, verified live). Closure
note to the PM with the suite count.

**Depends on:** W7.

---

## 3. Sequence

```
W1 coach (§18)  ∥  W2 ux (row/card/sheet/Settings)  ∥  W3 backend (shape, validators, schema 6)
        ↓                        ↓                              ↓
W4 backend (ladder + copy, needs W1 + W3)      W5 backend writes SQL (needs W3) → release applies
        ↓                        ↓
W6 frontend (needs W2 + W3; picks up W4's strings when they land — the row does not wait for the verdict)
        ↓
W7 QA (needs everything)  →  W8 release (W5 applied first)
```

W1, W2 and W3 run together on day one. W4 and W6 run together once their inputs exist. W5's SQL is
applied whenever it is written and the selftest is green — it does not block W6. **Nothing merges
until W7 has pinned his logged session through the migration.**

## 4. Risks

- **Data at risk: his one logged session, and every session after it.** The set shape moves for the
  first time with real data in the store. Mitigation: `ld` absent means kg, the v6 pass writes only
  the version, D1 pins the session by id, and D9 is asserted on the whole array. **The two drop
  paths are real today** (B-112): a key beside `w` dies in `validateEntry` on save and in
  `hydrateDraft` on reload. Both are closed in the same order that first needs them, and W6 closes
  `hydrateDraft` before it builds the row.
- **The two validators must move together.** JS and SQL each check `ld`; if they drift, a set the
  app saved is refused on push, or a malformed one lands. W5 mirrors W3's `LIMITS` and messages and
  the selftest proves it; the order of applying is free (§W5) so no lockstep deploy is needed.
- **The lattice is in nine sites, not the stepper** (§0.3). Missing one leaves a `Go to 83.7 kg`
  that cannot be built. W1's "what changes" table is the checklist and W4's meta-test recomputes
  every emitted figure from its components.
- **A wrong bar is a wrong number, silently.** The card remembers the last session's bar; a machine
  substitute under a barbell id opens with `bar 20 kg` set. Mitigation: the chip states the bar on
  the card, the total is on every row, and switching never re-values a typed number. Residual: he
  can still not notice. Q3 is the honest place to raise whether a mark is wanted.
- **Rounding.** 0.1 kg at the total loses ≤ 0.05 kg per set against exact — smaller than any
  plate's tolerance. Rounding per component instead would compound and can make two identical plate
  loads store different `w`; a mutant in W7 pins that. If the coach wants finer, the change is one
  constant and every displayed token already rounds to 0.1, so the *display* would then disagree
  with storage — say so if it comes up.
- **Migration surface for the importer:** 2–6. WO-002's importer criteria restated.
- **What could regress:** every verdict test on a kg-direct set must pass unchanged (W4); the
  kg-direct row DOM must diff clean against `main` (W6). If either fails, that is the finding, not
  the test.
- **Substitution stays unmodelled** in this order. A machine row logged under `d1a` feeds ST1 and
  P1 as barbell history until Chady answers Q3 (B-111). That is the state today; this order neither
  improves nor worsens it.

## 5. Needs from Chady

*Resolved at the close — see §9.2 for each one's outcome. Left as written so the ask is on the record.*

1. **His bar weights, by name**: the barbell (20 kg? confirm), the EZ bar, any others (trap bar, a
   fixed bar, a 15 kg bar). Unit per bar.
2. **Per phone or per account** for the profile. PM's answer is per phone (§0.2). Say if Diana's
   phone should inherit his bars — it would flip the store to `log_meta`.
3. **Today's session, for the pin.** Settings → Export, and send the file, or tell the main session
   to read the `sessions` row. D1 cannot be written without the id.
4. **CLAUDE.md §3.5 wording.** Reaffirm: stored kg, entry in kg or lb, step in the entry unit. The
   closure edits the line to say so.
5. **Q3, after W1**: mark substitutions or read history as-is. Not before the coach's trade-off.
6. **Who runs the SQL editor** for W5: the dashboard is his; WO-008's runbook says how.

## 6. Data criteria, house style

- **D1 · His session is untouched.** With the log holding his session (id pinned in the fixture),
  migrate v5 → 6: `JSON.stringify(session)` is byte-identical, `w` on every set is the same number
  it was, no set gains an `ld`, and the only store change is `schemaVersion: 6`.
- **D2 · What he saw is what is stored.** Enter `bar 20 kg + 90 lb`: the row shows `= 60.8 kg`; the
  saved set is `{w: 60.8, r: 5, ld: {bar: 20, bu: "kg", add: 90, au: "lb"}}` and `w` equals the
  displayed number exactly, not the unrounded 60.823.
- **D3 · The draft survives a reload mid-entry with both halves.** Type `90` in lb with bar 20 kg on
  set 1, `5` reps, leave set 2 half-typed (`add: "1"`); reload. The draft is offered back with set 1
  showing `90 lb`, `= 60.8 kg`, `5` reps, and set 2 showing `1` in lb with the same bar; declining the
  draft discards it; `phat:v1:draft` is byte-identical across the reload.
- **D4 · The push validator accepts the new keys and refuses a malformed unit.** A doc with a valid
  `ld` lands; `au: "kilo"`, `bar` without `bu`, `add: -5`, and `w: 61` against an `ld` that
  composes to `60.8` are each refused by name, in JS (`validateSessionDoc`) and in SQL, with the same
  message.
- **D5 · A malformed component blocks the save and names the token.** `add: "7.5.0"` in lb: the
  save is refused, the row is marked, the token reads `7.5.0`, and nothing is written to
  `phat:v1:log`.
- **D6 · A blank `ld` row is blank.** A row in lb mode with nothing typed is skipped silently on
  save, exactly as an empty kg row is; it is not `incomplete`.
- **D7 · Restore round-trips components byte-identically.** Export a log holding one `ld` set and
  one kg-direct set; restore with REPLACE; `JSON.stringify` of both sets equals the export's.
- **D8 · A kg-direct row is today's row.** With no bar and unit kg, typing `100` stores `{w: 100,
  r: 5}` with no `ld`, and the set row DOM is identical to `main`'s.
- **D9 · Never a silent re-value.** Switching a card from kg to lb with `60` typed never changes
  `w` without a confirmation naming both numbers; declining leaves `w: 60` and no `ld`.

## 7. Backlog items filed by this order

B-109 (the ask), B-110 (the lattice, coach), B-111 (substitution, Chady's decision), B-112 (the two
drop paths for any key beside `w` — P0-class, closed inside this order), B-113 (profile not in the
backup, accepted).

## 8. Dispatch list (for the main session)

1. `strength-coach` → **W1**, brief: *Addendum §18. Four exact questions in WO-010 §W1 — the increment
   ladder per way of building the load, Z2/I2's source when the slot's tag may lie, the substitution
   mark trade-off (recommend, do not rule), and bodyweight + lb. Rule blocks, copy per case, one
   failing example each, and a "what changes" table over the nine lattice sites in §0.3. Read
   `coach-audit.md` §3 and the addendum's I2/Z2 first. The data shape in WO-010 §1 is fixed.*
2. `ux-designer` → **W2**, brief: *Spec §4.4a/§4.4b and Settings → Gym per WO-010 §W2. The kg total
   on every set row, no tap; the row's geometry identical in both modes; one chip + sheet per card;
   bars only in Settings. Refine the PM's recommendation; string budget at 366 px in Archivo.*
3. `backend-engineer` → **W3**, brief: *WO-010 §1 and §W3. `composeLoad`, `loadModeFor`,
   `validateEntry` carrying `ld`, `validateSessionDoc`/`backupPayload` refusing malformed `ld`,
   schema 6 on `V_LD`, importer 2–6, `LIMITS` in one table. A set without `ld` must serialise
   byte-identically to today — assert the literal. No verdict changes.*
   *(1–3 in parallel.)*
4. `backend-engineer` → **W4** after W1 + W3, brief: *Transcribe addendum §18 into `logic.js` at the
   sites its table names and no others. Every §18 example is a test; every kg-direct verdict test
   passes unchanged; a meta-test recomputes every emitted `Go to`/`Drop to` from its components.*
5. `backend-engineer` → **W5** (write) after W3, then `release-engineer` (apply), brief: *Mirror §1
   in `phat_validate_session_doc`, same messages as JS, tolerance 0.05, selftest with W3's six
   fixtures. Apply per README §1 and record the selftest output. Order is free; apply before merge.*
6. `frontend-engineer` → **W6** after W2 + W3, brief: *`hydrateDraft` carries `ld` first (B-112).
   Then the chip, sheet, `ld` row, total on the ghost line, stepper in the entry unit, Settings →
   Gym on `prefs.gym`. Kg-direct row DOM diffs clean against `main`. Strings from `logic.js` only.*
7. `qa-engineer` → **W7**, brief: *D1–D9. Pin his logged session by id through v5 → 6. Attack
   `validateEntry` and `hydrateDraft`. Four named mutants. Phone checklist for what only the phone
   answers.*
8. `release-engineer` → **W8**, brief: *W5 applied and recorded; merge, deploy, byte-verify,
   `sw.js` header rule, `/logic.js` body contains `V_LD`; re-push of his session leaves the row
   byte-identical.*

---

## 9. Closure record — 2026-09-12, by `project-manager`

### 9.1 Where it is

**`main` @ `9f06d98`** (`--no-ff` merge of `wo-010-units`, W1–W7), then **`11c44ff`** (CLAUDE.md §3.5, on Chady's
reaffirmation). Deployed by the main session: **59 files byte-verified** on the production origin (11 shell + 48
photographs); live `/logic.js` fetched and carries `V_LD = 6` and `SCHEMA_VERSION = 6` in the body; the chip and
Settings → Gym on the live screen. `sw.js` stayed **`v5`** by its header rule — the file list did not change and the
per-launch refresh carries `index.html` + `logic.js` as one unit. `migrate-006-ld.sql` applied to the project and probed:
same refusal sentence as `logic.js`; 60.75 lands, 60.86 is refused, against a 60.8 build. Server after the close: 2 users,
Chady's 1 session, 0 conflicts (QA's soft-deleted probe row and its two `conflicts` rows removed from the dashboard).
Suite **802 / 802 / 0**.

### 9.2 The chain, item by item

| Item | Owner | Commit | Outcome |
|---|---|---|---|
| W1 | `strength-coach` | `dee6fe4` | Addendum §18. L1 (two grids chosen by the working-load set's `ld`, never the slot; 5 lb on `add`, nearest ties down in lb; the verdict prints kg *and* the build), L2 (`ld` owns the ladder and the build phrase; `implement` owns only `per DB` / `bodyweight`; a bar overrides `db`), L3 (SP1 fits the source set's grid), L4 (bodyweight + lb). PM's proposal accepted with one change: the too-heavy drop is nearest-then-at-least-one-step. **§18.6 #1 found the kg-direct bug** — at ≤ 22.5 kg `Drop to {same load}` was a hold, at 1.4 kg an increase. Q3: recommends the one-tap `Swapped`, does not rule. §18.8 asks two gym facts (B-117). 0.1 kg rounding and the 5 lb / 2.5 kg stepper confirmed |
| W2 | `ux-designer` | `5ff1173` | Spec §19: §4.4a the row in `ld` mode, §4.4b the chip and sheet, Settings → Gym; every string tabled, control inventory rows, budgets measured. Findings: `ghostText` reads `pv.w` only (moved into `logic.js`), the 10 px `.unit` caption (B-118) |
| W3 | `backend-engineer` | `c0714d8` | `LIMITS`, `toKg`, `composeLoad`, `buildWord`, `loadModeFor`, `validateGymProfile`; `validateEntry` / `validateDraft` / `validateSessionDoc` carry and refuse `ld` by name; `canonSession` orders `ld`; `SCHEMA_VERSION` 6 on `V_LD`, the pass a stamp only; importer 2–6. **B-112 save side closed.** Suite 740, twelve mutants killed |
| W6 | `frontend-engineer` | `48b88a4` | **B-112 reload side closed first — and it had two halves: `saveDraft` as well as `hydrateDraft` rebuilt `{w, r}`.** The row in lb with the kg row's geometry (measured identical at 400 px and 200 %, card 474 px in both modes); `= 60.8 kg` on the ghost line; steppers 5 lb / 2.5 kg that never snap; the chip and sheet; a unit switch with typed weights asks and is undoable, a bar switch names both totals; Settings → Gym through `validateGymProfile` to `prefs.gym` and nothing else. **D8: the kg-direct row DOM is `main`'s byte for byte** |
| W4 + W5 | `backend-engineer` | `5a64064` | §18 transcribed at the sites §18.7 marks as moving and no others; the one kg-direct change is the §18.6 #1 drop; a 60,030-verdict differential against `c0714d8` found nothing else. SQL: `phat_validate_ld` mirrors `ldDocProblems` sentence for sentence, tolerance 0.05 + 1e-9, `migrate-006-ld.sql` function-only; selftest section F, nine probes. Suite 785 |
| W7 | `qa-engineer` | `16b613d` | **Pass for release** at `5a64064`. D1–D9 each with evidence in `docs/decisions.md` (2026-09-12, W7). D1 on his real export (hash 1528318698), his six verdicts identical under `5d9525c` / `c0714d8` / `5a64064`; D4 live against the project as Diana with the eight refusal sentences pinned, rows cleaned afterwards; the ladder re-derived by hand on numbers S41 does not use; a 580,608-verdict differential; eleven `logic.js` mutants killed by the suite, the SQL tolerance mutant killed live, the `hydrateDraft` mutant killed in the browser rig. Suite 802. Pinned as observed: the `+ 0 lb` drop (B-114), the `no weight` token (B-115); found outside the order: B-98 re-observed |
| W8 | `release-engineer` + main session | `9f06d98`, `11c44ff` | Merge, deploy, byte-verify (59), `V_LD` in the live body, `sw.js` `v5` unchanged, SQL applied and probed, server state confirmed. Upload by the main session |

**§5's six needs, resolved.** (1) Bar weights — **still his**; shipped on the 20 kg assumption with Settings → Gym to
hold the rest, B-117. (2) Per phone or per account — **the PM's**, per phone, accepted as B-113; not asked to change.
(3) His session for the pin — **fetched from the server by the main session**; S42's D1 is on those bytes. (4) §3.5
wording — **amended on `11c44ff` on his reaffirmation**: stored kg, entered as bar + added in kg or lb, step in the
entry unit, bodyweight untouched. (5) Q3 — **open**, B-111, the yes/no on the row. (6) The SQL editor — **the main session
applied it** and probed the boundary.

### 9.3 Backlog at the close

B-109, B-110, B-112 **done** with evidence on their rows; B-113 **accepted as filed**; B-111 **open** on the coach's
recommendation, Chady's yes/no owed. Filed by the close: **B-114** the `+ 0 lb` drop phrase (P2, coach to rule);
**B-115** the `no weight` token on a hand-edited row (P3); **B-116 the warm-up sets question** (P1 table, the PM's,
deliberately not answered here — his first session logged five ramping sets on `d1a`, 20 → 70 kg at
12 / 12 / 15 / 14 / 10, on a 3 × 3–5 slot, and every engine read them as prescribed work); **B-117** the two gym facts the
ladder assumes (P2, Chady's: 2.5 lb plates; bars by name); **B-118** the 10 px unit caption (P3). B-98 carries W7's
second observation and stays one row.

### 9.4 What only his phone answers

Manual item 10 in `tests.html`: the chip one-handed with chalk, the sheet, the `= 60.8 kg` token under gym light.
Everything else on D1–D9 has its evidence cited.

### 9.5 Standing diagnosis

One session logged; this order was the first made from lifting with the app. The next number is the second session.
