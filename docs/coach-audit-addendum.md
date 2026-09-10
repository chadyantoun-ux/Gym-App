# Coaching audit — addendum

Owner: `strength-coach`. Written 2026-09-09. Answers WO-003 §W2.
Companion to `docs/coach-audit.md`, which is **not edited**. Nothing here contradicts it except where
§G1 says so explicitly, with the reason.

Confidence tags, as in the audit: `[Certain]` hard evidence · `[Likely]` strong inference ·
`[Guessing]` gap-filling · `[Convention]` defensible standard practice, not physiology ·
`[Opinion]` my coaching preference.

**Rule ids introduced here.** `Z1` `Z2` `Z3` (the zero-load family, B-32), `I1` `I2` (implements),
`S2` (the reach of the pain flag), `G1` (raised and ruled — see §G1), `TW1` (what counts as a training
week — added 2026-09-09 in §6, answering a question raised by W1).
None collide with the audit's `P1 H1 ST1 W1 V1 R1 SP1 D1 S1`.

**Where a worked example and a copy line disagree, the worked example is correct.** WO-003 Decision 5.
Every example below is written to be pasted into a test.

---

## 0. Rulings at a glance

| # | Question | Ruling |
|---|---|---|
| 1 | Completeness test (B-32) | `r >= 1` and `w` a finite number `>= 0`. **A 0 kg set is completed.** Blank is not zero. Rule **Z1**. |
| 1 | Copy at working load 0 | Every load token passes through `loadWord()`. `bodyweight` or `zero load`, never `0 kg`, never `Drop to 0 kg`. Rule **Z2**. |
| 2 | Hypertrophy verdict at 0 kg | Tonnage is banned when either side is zero-load. Compare **total reps** across the first `ex.s` sets. The exit from "0 vs 0 forever" is H1 case 2, which fires first. Rule **Z3**. |
| 3 | 42 implement tags | Table in §I1. 13 `bb` · 8 `db` · 12 `machine` · 4 `cable` · 5 `bodyweight`. |
| 3 | Who gets the increment line | `db`, `machine`, `cable`, `bodyweight`. **Never `bb`, never `k:"speed"`.** The rep number in it is `ex.hi + 2`, not a literal `7`. Rule **I2**. |
| 4 | Pain flag → SP1 | **No suppression.** The number prints unchanged. Reasoned from §10's own prohibition on working around pain. Rule **S2a**. |
| 4 | Pain flag → V1 | **Yes, suppressed.** Any pain note in the last 7 days on any exercise → `offer: null`, nothing stamped, nothing rolled back. Rule **S2b**. |
| 4 | Pain flag → ST1 / D1 / R1 / W1 | ST1 gets one factual appended line (**S2c**, deferrable). D1, R1, W1: no interaction at all. |
| — | H1 case 2's increment | The audit never defines it. Ruled in **G1**. Conflicted with a pinned W6 criterion (`42.5` → `35`); **PM accepted G1 and restated the criterion**, 2026-09-09. |
| 5 | What counts as a training week | **Distinct qualifying dates**, not session count. Three saves on one date is one day. Rule **TW1**, §6a. |
| 5 | The Monday straddle | **Left as is.** Fixed Monday-start weeks, no rolling window. It can only undercount, which is the safe direction at all three gates. §6b. |

---

# 1. B-32 — the zero-load family

## Rule Z1 — what counts as a completed set

```
Rule: Z1 — completed-set test
Applies to:   every role (power | hyp | speed). Every rule that reads sets:
              P1, H1, ST1, SP1, D1, and PHAT.lastFor.
              Supersedes the parenthetical "(completed = w > 0 AND r > 0)" in
              audit §3's Inputs block. That parenthetical is withdrawn.
Inputs:       one stored set {w, r}. After WO-001 these are Numbers, never NaN,
              never strings — logic.js `validateEntry` guarantees it.
Logic:        completed(s) = Number.isFinite(s.r) && s.r >= 1
                          && Number.isFinite(s.w) && s.w >= 0

              Explicitly:
                w === 0   -> COMPLETED. A rack chin, an unweighted dip, a
                             bodyweight pull-up. This is real data.
                w === ""  -> NOT completed. Blank is the absence of a number,
                             not the number zero. Decide blankness on the raw
                             string BEFORE any coercion: `+"" === 0` in
                             JavaScript and that identity is how a forgotten
                             weight field becomes a silent bodyweight set.
                w  <  0   -> NOT completed. Unreachable through the UI; refuse
                             it rather than trust that.
                r === 0   -> NOT completed. A set of zero reps is not a set.
                r  <  1   -> NOT completed. Reps are integers.
Output copy:  none. Z1 is a predicate, not a screen.
Not enough data: not applicable — this rule decides what "data" means.
```

**Worked examples**

1. `{w:0, r:10}` → completed. It is the rack chin. It counts toward `C`, toward `ex.s`, toward
   `lastFor`, and toward every comparison.
2. **Boundary.** `{w:0, r:1}` → completed. `{w:0, r:0}` → not completed.
3. **The failing case this rule exists to prevent.** Draft row `{w:"", r:"10"}`. WO-001 classifies it
   `incomplete` and blocks the save, so it never reaches the verdict engine. If a future path ever
   hands it to `PHAT.verdict` anyway, Z1 must reject it — not read it as a 10-rep bodyweight set.
4. `{w:2.5, r:8}` → completed. Nothing about this rule changes the loaded case.

**Rationale.** `[Certain]` the load on a rack chin is not zero, it is his body — the `0` in the field
is the *added* load. B-21 already ruled that this is data the storage layer must keep; dropping it one
layer up is the same bug with a nicer justification, and the backlog forbids it by name. `[Certain]`
blank and zero are different facts and JavaScript's `+""` conflates them, which is the single most
likely way an engineer reintroduces B-21 while believing they implemented Z1.

---

## Rule Z2 — power-day copy when the working load is 0

Rule P1 (audit §3) is unchanged in its logic. What changes is how a load is *rendered*, plus three
named deltas.

```
Rule: Z2 — zero-load rendering for P1
Applies to:   k:"power". Session screen verdict. Also the load token in any
              other rule that prints a kg figure (H1, SP1's source, D1's T1).
Inputs:       the load to print, and the exercise's implement tag (Rule I1).
Logic:        loadWord(w, implement):
                w  > 0                                 -> `${r1(w)} kg`
                w === 0 && implement === "bodyweight"  -> `bodyweight`
                w === 0 && any other implement         -> `zero load`

              Every load token in every P1 string passes through loadWord().
              The string `0 kg` must never be produced by any rule.

              DELTA 1 — case 1 (too heavy) at load 0.
                round2.5(0 * 0.95) is 0. There is nothing to remove and the app
                must not invent a way to make the movement easier.
                Print the hold instruction instead of a drop instruction.

              DELTA 2 — increase verb at load 0.
                Cases 3 and 4 read `Add X kg` instead of `Go to X kg`.
                X = 2.5 (the minimum increment; every multiplicative term is
                zero at zero load — see G1).

              DELTA 3 — case 2 (not matched) list format.
                If NO weight in C is 0: keep the audit's compact form,
                  `Sets not matched: 100 / 100 / 95 kg.`
                If ANY weight in C is 0: render each entry in full, joined by
                " / ",
                  `Sets not matched: 2.5 kg / bodyweight.`
                Invariant, worth asserting: the repeat target in case 2 is
                max(weights in C) and can never be 0 — if max were 0 every set
                would be 0 and `equal` would be true, so case 2 could not fire.
Output copy:  Case 1: `4 reps at bodyweight. Below the range. Hold here until all 2 sets reach 6 reps.`
              Case 2: `Sets not matched: 2.5 kg / bodyweight. Repeat 2.5 kg until all 2 sets reach 10 reps.`
              Case 3: `12 reps at bodyweight on every set. Too light. Add 2.5 kg.`
              Case 4: `Top of range on all 2 sets at bodyweight. Add 2.5 kg next session.`
              Case 5: `Stay at bodyweight until all 2 sets reach 10 reps.`
Not enough data: unchanged from P1 — fewer than `ex.s` completed sets renders nothing.
```

**One more guard, in SP1.** `R` is the heaviest qualifying source set. If the heaviest qualifying set
is `0 kg`, `R === 0` and SP1's target, band and `speedTooHeavy` all degenerate (`w > 0 * 0.75` flags
every set ever logged). **Require `R > 0`.** A source set at zero load does not qualify; if it is the
only candidate, SP1 shows its no-data fallback. `[Certain]` — this is arithmetic, not coaching. None of
the three speed sources (`d1a` bb, `d2a` bb, `d1d` db) can legitimately be logged at 0, so this is a
defence, not a case.

**Worked examples** — `d1c Rack chin {s:2, lo:6, hi:10, k:"power", cut:1}`, implement `bodyweight`.

1. **The B-32 headline.** `0×10, 0×9` → equal; `C[0].r` 10 ≥ lo 6; not all ≥ hi 10 → case 5.
   → `Stay at bodyweight until all 2 sets reach 10 reps.`
   The substring `0 kg` does not appear. This is the string WO-003 §W6 asks for.
2. `0×10, 0×10` → case 4 →
   `Top of range on all 2 sets at bodyweight. Add 2.5 kg next session.`
   plus the I2 appendix (bodyweight is a tagged implement, `ex.hi + 2` = 12):
   `If 2.5 kg is not available, add reps up to 12 first, then jump.`
3. **Boundary.** `0×12, 0×12` — every rep at `hi + 2` → case 3 beats case 4 →
   `12 reps at bodyweight on every set. Too light. Add 2.5 kg.` plus the I2 appendix.
   At `0×11, 0×12` case 3 does not fire (min rep 11 < 12) and case 4 does →
   `Top of range on all 2 sets at bodyweight. Add 2.5 kg next session.`
4. **Failing case.** `0×4, 0×6` → `C[0].r` 4 < lo 6 → case 1 →
   `4 reps at bodyweight. Below the range. Hold here until all 2 sets reach 6 reps.`
   The strings `Drop to`, `0 kg` and `95%` appear nowhere.
5. **Mixed loads.** `2.5×8, 0×10` → not equal → case 2 →
   `Sets not matched: 2.5 kg / bodyweight. Repeat 2.5 kg until all 2 sets reach 10 reps.`
6. **Non-bodyweight implement at zero (a mis-log, handled not deleted).** `d2c Leg extension`
   `{s:2, lo:6, hi:10, k:"power", cut:1}`, implement `machine`, logged `0×8, 0×8` → case 5 →
   `Stay at zero load until all 2 sets reach 10 reps.`
   The set stays in storage byte-identical. The app does not correct it, delete it, or comment on it.

**Rationale.** `[Certain]` you cannot subtract load from bodyweight; a rule that prints `Drop to 0 kg`
is arithmetically valid and physically impossible, and the lifter's only reading of it is that the app
is broken. `[Certain]` at zero external load the only progressive variable is reps, so hold-and-add-reps
is the correct instruction and it is also the conservative one. `[Opinion]` on the two words: `bodyweight`
is what he would say out loud; `zero load` exists only so a mis-logged machine set does not read as a
claim about his body. The app must not suggest band assistance, a rack height, a ROM change or a
substitute movement — that is coaching the exercise, and it is not what this rule is for.

---

## Rule Z3 — hypertrophy comparison when the load is 0

`d3b Rack chin` is `{s:3, lo:8, hi:12, k:"hyp"}` and he will do it at bodyweight for months. Tonnage
is `Σ w·r = 0` against a previous `0`, so audit §9 case 4 reads `Volume matched. One more rep next
session.` forever, and the percentage arithmetic divides by zero.

**Two things fix it, and the first matters more than the second.**

```
Rule: Z3 — hypertrophy comparison basis
Applies to:   k:"hyp". Session screen verdict. Inserted into audit §9's case 4;
              cases 1, 2 and 3 are unchanged in order and unchanged in trigger.
Inputs:       C     = the first `ex.s` completed sets this session (Z1).
              Cprev = the first `ex.s` completed sets of the previous entry.
                      If the previous entry has fewer than `ex.s` completed
                      sets, H1 case 3 (baseline) already fired — Z3 is never
                      reached with a short Cprev.
Logic:        zeroLoad(X) = every set in X has w === 0
              cur  = zeroLoad(C)
              prev = zeroLoad(Cprev)

              4a. cur && prev      -> compare TOTAL REPS: sum(r) over C vs Cprev
              4b. cur && !prev     -> no comparison. New bodyweight baseline.
              4c. !cur && prev     -> no comparison. New loaded baseline.
              4d. !cur && !prev    -> tonnage, exactly as audit §9 case 4 today

              Reps and tonnage are never compared against each other, and a
              tonnage percentage is never computed with a zero denominator.
Output copy:  4a up      : `Reps up: 29 against 26 at bodyweight.`
              4a matched : `Same reps at bodyweight: 30. Add one rep next session.`
              4a down    : `Reps down: 24 against 30 at bodyweight. Match it next session.`
              4b         : `Bodyweight this time, loaded last time. Not comparable. New bodyweight baseline.`
              4c         : `Added load since last session. New baseline at 2.5 kg.`
              4d         : unchanged from audit §9.
              No percentage is printed in 4a. Reps are small integers; a
              percentage on them is decoration, and this app does not decorate.
Not enough data: unchanged from H1 — fewer than `ex.s` completed sets renders
              nothing. No previous entry at all -> H1 case 3, `First time logged.
              This becomes your baseline.`
```

**The real answer to "0 against 0 forever" is H1 case 2, not the rep comparison.** Case 2 fires when
every rep is above `hi`, *before* any comparison, and at zero load it prescribes `Add 2.5 kg next
session.` So the rack chin's progression is: reps climb inside 8–12 (case 4a tracks it), reps pass 12
on every set (case 2 fires), external load appears, and from the next session it is an ordinary loaded
hypertrophy exercise. The rep comparison only governs the in-range zone. State this to QA explicitly —
it is the acceptance criterion that proves the loop terminates.

**Worked examples** — `d3b Rack chin {s:3, lo:8, hi:12, k:"hyp"}`, implement `bodyweight`.

1. This session `0×10, 0×10, 0×9` (29 reps). Previous `0×9, 0×9, 0×8` (26 reps). Both zero-load,
   all reps inside 8–12 → case 4a, up → `Reps up: 29 against 26 at bodyweight.`
2. **The bug this rule closes.** This `0×10, 0×10, 0×10` (30). Previous `0×10, 0×10, 0×10` (30).
   Today: `Volume matched. One more rep next session.` — and it will say that every week for a year.
   Under Z3 → `Same reps at bodyweight: 30. Add one rep next session.` The string `Volume` does not
   appear, and no percentage is computed.
3. Down: this `0×8, 0×8, 0×8` (24) against previous `0×10 ×3` (30) →
   `Reps down: 24 against 30 at bodyweight. Match it next session.`
4. **Boundary — the exit.** `0×13, 0×13, 0×13`. Every rep > `hi` 12 → **H1 case 2 fires first**, before
   Z3 is consulted → `All sets above 12 at bodyweight. Add 2.5 kg next session.` plus the I2 appendix.
   At `0×12, 0×12, 0×12` case 2 does **not** fire (12 is not *above* 12, audit §9 example 2) → falls
   through to Z3 4a.
5. **Failing case.** `0×6, 0×7, 0×8` → `C[0].r` 6 < lo 8 → H1 case 1, at zero load, Z2 delta 1 →
   `6 reps at bodyweight. Below the 8–12 range. Hold here until all 3 sets reach 8 reps.`
   No drop instruction, no `0 kg`.
6. **Basis change, both directions.** This `0×10 ×3` against previous `2.5×10 ×3` → 4b →
   `Bodyweight this time, loaded last time. Not comparable. New bodyweight baseline.`
   This `2.5×10 ×3` against previous `0×10 ×3` → 4c → `Added load since last session. New baseline at 2.5 kg.`
   (Today the second of those computes `(75 − 0)/0` and prints `Volume up 0% — 75 kg against 0 kg.`)
7. **Mixed session is not zero-load.** This `0×10, 0×10, 2.5×10` → `zeroLoad(C)` is false → 4d,
   ordinary tonnage, denominator non-zero. Correct: he did carry load, and the tonnage says so.

**Rationale.** `[Certain]` at a fixed load, more total reps is more work — that is the whole basis of
double progression and it is what PHAT asks for before the weight moves. `[Certain]` tonnage is
undefined as a ratio when either side is zero, so 4b/4c must refuse rather than produce a number;
"not comparable" is a correct and shippable answer. `[Opinion]` I use total reps rather than a per-set
comparison because the prescription is `3 × 8–12`, a block of work, and one set redistributed is not a
finding worth a sentence between sets.

---

# 2. Implement tags

## Rule I1 — the 42 tags, and what `db` changes

```
Rule: I1 — implement tag
Applies to:   PROGRAM data. Consumed by B-22 (per-DB display), Rule I2
              (the increment line), Rule Z2 (the zero-load word) and Rule SP1.
Inputs:       none at runtime. One new field per slot: implement, a string from
              {"bb","db","machine","cable","bodyweight"}. Every slot has one.
Logic:        implement === "db"  -> this exercise's weights are PER DUMBBELL,
                                     everywhere, without exception:
                                     the logged number, the ghost text, P1's
                                     and H1's next load, SP1's target and band,
                                     and any numeric shown on the Trend tab.
                                     The Session target line gains the suffix
                                     ` · per DB`.
              any other implement -> no unit suffix, no change of meaning.
Output copy:  `3 × 3–5 · per DB` on d1d. `3 × 3–5` on d2a. Audit D-3, unchanged.
Not enough data: not applicable — the tags are static data, not a measurement.
```

**The tags. Apply mechanically; no slot is left untagged.**

| id | name | k | implement | conf |
|---|---|---|---|---|
| d1a | Bent-over / Pendlay row | power | `bb` | `[Certain]` |
| d1b | Weighted pull-up | power | `bodyweight` | `[Certain]` |
| d1c | Rack chin | power | `bodyweight` | `[Certain]` |
| d1d | Flat DB press | power | `db` | `[Certain]` |
| d1e | Weighted dip | power | `bodyweight` | `[Certain]` |
| d1f | Seated DB shoulder press | power | `db` | `[Certain]` |
| d1g | Cambered bar curl | power | `bb` | `[Certain]` |
| d1h | Skull crusher | power | `bb` | `[Likely]` |
| d2a | Squat | power | `bb` | `[Certain]` |
| d2b | Hack squat | power | `machine` | `[Likely]` |
| d2c | Leg extension | power | `machine` | `[Certain]` |
| d2d | Stiff-leg deadlift | power | `bb` | `[Certain]` |
| d2e | Glute-ham raise or lying leg curl | power | `bodyweight` | `[Opinion]` |
| d2f | Standing calf raise | power | `machine` | `[Likely]` |
| d2g | Seated calf raise | power | `machine` | `[Certain]` |
| d3a | Row — speed work | speed | `bb` | `[Certain]` |
| d3b | Rack chin | hyp | `bodyweight` | `[Certain]` |
| d3c | Seated cable row | hyp | `cable` | `[Certain]` |
| d3d | DB row or shrug | hyp | `db` | `[Certain]` |
| d3e | Close-grip pulldown | hyp | `cable` | `[Certain]` |
| d3f | Seated DB press | hyp | `db` | `[Certain]` |
| d3g | Upright row | hyp | `bb` | `[Likely]` |
| d3h | Lateral raise | hyp | `db` | `[Certain]` |
| d4a | Squat — speed work | speed | `bb` | `[Certain]` |
| d4b | Hack squat | hyp | `machine` | `[Likely]` |
| d4c | Leg press | hyp | `machine` | `[Certain]` |
| d4d | Leg extension | hyp | `machine` | `[Certain]` |
| d4e | Romanian deadlift | hyp | `bb` | `[Certain]` |
| d4f | Lying leg curl | hyp | `machine` | `[Certain]` |
| d4g | Seated leg curl | hyp | `machine` | `[Certain]` |
| d4h | Donkey calf raise | hyp | `machine` | `[Likely]` |
| d4i | Seated calf raise | hyp | `machine` | `[Certain]` |
| d5a | Flat DB press — speed work | speed | `db` | `[Certain]` |
| d5b | Incline DB press | hyp | `db` | `[Certain]` |
| d5c | Machine chest press | hyp | `machine` | `[Certain]` |
| d5d | Incline cable fly | hyp | `cable` | `[Certain]` |
| d5e | Cambered bar preacher curl | hyp | `bb` | `[Certain]` |
| d5f | DB concentration curl | hyp | `db` | `[Certain]` |
| d5g | Spider curl | hyp | `bb` | `[Likely]` |
| d5h | Close-grip bench | hyp | `bb` | `[Certain]` |
| d5i | Skull crusher | hyp | `bb` | `[Likely]` |
| d5j | Rope pressdown | hyp | `cable` | `[Certain]` |

**Totals for the snapshot test:** 42 slots — `bb` 13, `db` 8, `machine` 12, `cable` 4, `bodyweight` 5.
By day: d1 8, d2 7, d3 8, d4 9, d5 10.

**The six judgement calls, named so nobody has to guess later.**

- **d1h and d5i Skull crusher → `bb`** `[Likely]`. The EZ/cambered bar version is the default and the
  programme already gives him a cambered bar on both those days. If he does them with dumbbells, change
  one field to `db`.
- **d2b and d4b Hack squat → `machine`** `[Likely]`. The 45° hack squat machine, not the barbell
  behind-the-heels version. If he has no machine and uses a bar, change to `bb`.
- **d2e Glute-ham raise or lying leg curl → `bodyweight`** `[Opinion]`. The slot names two exercises
  with two implements. I tag it toward the GHR because it is named first, because the GHR is the
  harder and more valuable option, and because the programme already carries a dedicated
  `d4f Lying leg curl` on `machine`. Consequence if he chooses the curl: he sees `zero load` instead of
  `bodyweight` only if he logs a 0 (he will not, on a stack), and he sees the I2 increment line either
  way. No wrong load results from this tag being wrong.
- **d2f Standing calf raise → `machine`** `[Likely]`. Could be a Smith or a barbell.
- **d3g Upright row → `bb`** `[Likely]`. Could be a cable or a DB variant.
- **d4h Donkey calf raise → `machine`** `[Likely]`.
- **d5g Spider curl → `bb`** `[Likely]`. EZ bar is the default; DB spider curls are common.

Each is one field. **The cost of a wrong tag is a missing or spurious increment line — never a wrong
load.** Ask him once and edit; do not build an implement picker. `[Opinion]`

**One naming hazard for `backend-engineer`.** The tag literal `"bodyweight"` and the user's bodyweight
log (`phat:v1:bw`, Rule W1) are unrelated concepts one keyword apart. Do not name any helper
`bodyweight()`. CLAUDE.md §7's `top` incident is the precedent.

---

## Rule I2 — the "if 2.5 kg is not available" line

The audit's literal string is `If 2.5 kg is not available, add reps up to 7 first, then jump.` The `7`
is `hi + 2` for a 3–5 exercise and it is **wrong on every 6–10 slot**, which is most of the programme.
Parameterise it.

```
Rule: I2 — increment-unavailable appendix
Applies to:   P1 cases 3 and 4 (the two power outcomes that name a heavier load)
              and H1 case 2 (the one hypertrophy outcome that does).
              NEVER on P1 cases 1, 2 or 5. NEVER on k:"speed" — SP1 computes and
              rounds that number itself.
Inputs:       ex.implement, ex.hi, ex.k. No history, no minimum data.
Logic:        implement === "bb"          -> no appendix. A barbell makes 2.5 kg
                                             with a 1.25 kg plate per side.
              implement === "db"          -> appendix, worded per dumbbell
              implement === "machine"     -> appendix
              implement === "cable"       -> appendix
              implement === "bodyweight"  -> appendix (added load is whatever
                                             plate or dumbbell is to hand)
              The rep ceiling in the appendix is `ex.hi + 2` for k:"power",
              matching P1 case 3's own trigger. For k:"hyp" the appendix carries
              NO number — H1 case 2's trigger is `every r > hi` with no ceiling,
              and inventing one would be prescribing a rep range.
Output copy:  power, non-db : `If 2.5 kg is not available, add reps up to 12 first, then jump.`
              power, db     : `If 2.5 kg per DB is not available, add reps up to 7 first, then jump.`
              hyp,   non-db : `If 2.5 kg is not available, add reps first, then jump.`
              hyp,   db     : `If 2.5 kg per DB is not available, add reps first, then jump.`
              Rendered as a second line below the verdict, never appended to the
              same sentence.
Not enough data: not applicable.
```

**Worked examples**

1. `d1d Flat DB press {s:3, lo:3, hi:5}`, implement `db`, case 4 → `hi + 2` = 7 →
   `If 2.5 kg per DB is not available, add reps up to 7 first, then jump.`
   This reproduces the audit's literal string, plus the unit. The audit wrote it for exactly this slot.
2. `d1c Rack chin {s:2, lo:6, hi:10}`, implement `bodyweight`, case 4 → `hi + 2` = 12 →
   `If 2.5 kg is not available, add reps up to 12 first, then jump.`
   Today's literal `7` would tell him to stop two reps *below* his prescribed range.
3. **Boundary — the one that must print nothing.** `d2a Squat {s:3, lo:3, hi:5}`, implement `bb`,
   case 4 → `Top of range on all 3 sets. Go to 102.5 kg next session.` and **no second line**. Assert
   the string `If 2.5 kg` is absent.
4. **Failing case.** `d2c Leg extension`, implement `machine`, case 5 (hold) → no appendix. The
   appendix only ever accompanies a load increase; on a hold it is noise between sets.
5. `d3c Seated cable row {s:3, lo:8, hi:12, k:"hyp"}`, implement `cable`, case 2 →
   `All sets above 12. Go to 35 kg next session.` (see G1) then
   `If 2.5 kg is not available, add reps first, then jump.` — no number on hypertrophy.

**Rationale.** `[Certain]` a barbell reaches a 2.5 kg total step with a pair of 1.25 kg plates, so the
line is false on `bb` and false lines teach a user to stop reading. `[Convention]` pin stacks step 5 kg
and often 7.5 kg, plate-loaded machines step by the plates in the building, and dumbbell racks step 2 kg
or 2.5 kg at the bottom and 5 kg above roughly 20 kg — so a 2.5 kg-per-dumbbell request is frequently
unavailable on exactly the implement where it is most often asked for. `[Opinion]` restricting the
appendix to the two increase outcomes: a verdict read one-handed between sets should carry one
instruction, and the appendix is only actionable when he is about to try to make a jump.

---

# 3. Rule S2 — how far the pain flag reaches

Audit §10 stands unchanged: on a match, suppress load increases on that exercise, show the fixed
referral string, never assess, never substitute, never work around it. The question is what else the
flag touches.

**I answer it with one principle, taken from §10 itself: the app's response to pain is to stop
escalating and point at a person. Anything that quietly re-prescribes his training around a keyword
match is the thing §10 already forbids.** That principle gives different answers for SP1 and V1,
and the difference is not arbitrary — one would be re-prescribing a load, the other is declining to
add work.

```
Rule: S2 — the reach of the pain flag
Applies to:   SP1 (speed load), V1 (accessory reintroduction), ST1 (stall),
              D1 (deload), R1 (rest), Rule W1 (calories).
Inputs:       PHAT.painFlag(note)  — the audit's regex, unchanged.
              PHAT.painWindow(sessions, todayStr, days = 7)
                -> {active:Boolean, exIds:[...], names:[...], lastDate:"YYYY-MM-DD"|null}
                Scans every entry note in sessions dated [today-(days-1) .. today]
                for a painFlag match. Pure: no DOM, no storage, does not mutate
                `sessions`.
              Minimum data: none. If there are no sessions in the window,
              `active` is false. Absence is never read as a signal — the same
              principle as D1's "absence is not fatigue".
```

### S2a — SP1: **no suppression.** `[Opinion]`, reasoned

```
Logic:        A pain flag on a k:"speed" exercise, or on its SPEED_SRC source
              lift, changes SP1's output by exactly nothing.
              - The target kg prints unchanged.
              - The band prints unchanged.
              - `speedTooHeavy` still fires as normal.
              - The §10 notice renders on that card if the flag is on THAT
                exercise, per §10's existing per-exercise rule. It does not
                render on d3a because d1a carried a note.
Output copy:  unchanged from SP1. No extra line, no reduced number, no
              "take it easy", no suggestion to skip the session.
```

**Why not reduce it.** I considered printing the bottom of the band (65% instead of 67.5%) while a flag
is live. **I reject that.** It is re-prescribing a load in response to a keyword match on a note the app
is forbidden from interpreting — which is §10's own "never suggest a rep range or work around it",
applied to load instead of reps. It also fires on the accepted false positive `no pain today` and would
silently move his prescribed number. `[Certain]` the speed load is already 65–70% of a submaximal
reference; suppressing or shaving it does not make him safer, and a blank card makes him guess, and a
guess between sets goes up, not down.

**What actually protects him here is already built:** P1 holds the source lift's load while the flag is
live, and `R` is a 28-day historical maximum, so the speed number cannot climb during a flagged period.
State that to QA as the reason no cap is needed.

**Worked examples**

1. Note on `d3a Row — speed work`: `right shoulder pinch on set 4`. `painFlag` true. Source `d1a`
   logged `100 × 5` twelve days ago → `R` = 100, target 67.5. Card renders, unchanged:
   `67.5 kg. 65–70% of your 100 kg triple. Rest 60–90 s. Fast, never grinding.`
   plus, on the same card, §10's fixed two lines verbatim. The number `67.5` still appears; `65 kg`
   does not.
2. Note on the **source** lift `d1a` on Monday. Thursday's `d3a` card: the same
   `67.5 kg. 65–70% of your 100 kg triple.` and **no** §10 notice on `d3a` — the notice is
   per-exercise. (V1's offer is suppressed that week; see S2b.)
3. **Failing case, deliberately not a suppression.** Note `no pain today, felt strong` on `d4a`.
   Flag true (accepted false positive, audit §10). The squat speed target still prints its computed
   number. Nothing about his prescription moves on a false positive.

### S2b — V1: **yes, suppressed.** `[Opinion]`, conservative

```
Logic:        V1's offer gate gains one clause:
                AND PHAT.painWindow(sessions, todayStr, 7).active === false
              Scope: ANY exercise, not only this day's and not only the ones
              with cut:1. The offer's own gate is about systemic recovery.
              Effect, exactly:
                - offer -> null
                - lastReintroDate[dayId] is NOT stamped (he neither accepted nor
                  declined; stamping would double the delay to 14 days)
                - reintro[dayId] is NOT decremented. A pain note is NOT a
                  rollback trigger. Rollback stays what audit §5 says it is:
                  a stall or a deload. Pulling an exercise out of his programme
                  on a keyword match is the app assessing an injury.
                - no exercise already on screen is removed.
              Mid-session: if the offer is showing and unanswered when a note in
              the current draft matches painFlag on commit, WITHDRAW the offer
              and stamp nothing. If he already tapped `Add it`, the exercise
              STAYS — it is on screen and may already hold numbers, and
              CLAUDE.md §3.3 outranks this rule.
Output copy:  where the offer would have rendered, one line and no buttons:
              `No new exercise this week. You logged pain in the last 7 days.`
              No severity, no cause, no "rest", no "deload", no "see how it
              feels". The referral line lives on the exercise card, per §10, and
              is not repeated here.
Not enough data: no sessions in the window -> `active` false -> the offer runs
              normally. Silence about pain is not evidence of pain.
```

**Worked examples**

4. `trainingWeeks` 6, opening `d5 Chest & arms`, `reintro.d5` 0, no stall, no active deload. Without a
   flag the offer would be `Incline cable fly`. A note `left knee pain on set 2` exists on a `d2a`
   session 3 days ago → `offer: null`, `lastReintroDate.d5` unchanged, `reintro.d5` still 0. Screen
   reads `No new exercise this week. You logged pain in the last 7 days.`
5. **Boundary.** The pain note is on a session dated exactly `today − 6` → inside the window →
   suppressed. Move the same note to `today − 7` → outside → the offer renders normally with
   `Add it` / `Not yet`. Assert both directions; the window is inclusive of `today − 6` only.
6. **Failing case.** His last logged session was 20 days ago and carried a pain note; today he opens
   `d1`. `painWindow` is false → the offer renders. A three-week-old note is not evidence about this
   week, and a stale flag that silently freezes his programme is how a lifter learns to stop writing
   notes.
7. **Mid-session.** The `d5` offer is on screen, unanswered. He types `elbow pain` into `d5e`'s note and
   blurs. → the offer is replaced by the line in 4; nothing is stamped; when the 7 days clear it is
   offered again. Same case but he had already tapped `Add it`: `Incline cable fly` stays on screen,
   its sets still save, `reintro.d5` stays at 1.

**Rationale.** `[Certain]` V1's own gate is *"only if last week left you recovered and no lift went
backwards"* — a logged pain note is direct evidence against the first half of that sentence, and it is
the only recovery input the app has. `[Opinion]` any exercise, not just this day's, because adding
volume anywhere in a week he reported pain is the wrong direction and the counters are per-day only for
pacing, not because the days are independent physiologically. The asymmetry with S2a is deliberate:
declining to *add* work is refusal, which the app is allowed to do; shaving a prescribed load is
*treatment*, which it is not.

### S2c — ST1: one appended factual line. `[Opinion]`, deferrable

ST1's warning states a cause: *"Either the sets aren't close enough to failure, or you aren't eating
enough."* If he trained that lift through a logged pain note, that sentence is confidently wrong — the
same failure class as B-07 itself, the app blaming him for something that is not the cause.

```
Logic:        When ST1 reports a lift stalled AND painWindow(sessions, todayStr,
              21) names that lift's exercise id (21 days = ST1's own recent
              block), append ONE line below the existing warning block.
              The warning itself is unchanged, character for character.
              Do not suppress the warning: the stall is still a real finding.
Output copy:  `You logged pain on Row in this period. That is not something this app can assess.`
              Lift names comma-joined, matching the warning's own style.
Not enough data: no flag in the recent block -> nothing appended.
```

**Scope note for the PM.** This is a fifth ruling, not one of the four asked for. It costs one boolean
threaded into `stallReport`. **If it is cut, nothing else in WO-003 breaks** — but I recommend keeping
it, because the whole point of fixing B-07 was to stop the app making a confident wrong attribution,
and this is the remaining way it can still make one.

### S2d — everything else: no interaction at all

| Rule | Interaction | Why |
|---|---|---|
| **D1 deload** | **None.** A pain flag neither triggers a deload nor suppresses one. | Triggering on a keyword is the app diagnosing an injury. Suppressing is worse — a recommended deload is the conservative direction and must not be blocked. If D1 fires for its own reasons while a flag is live, both render. `[Opinion]` |
| **R1 rest timer** | **None.** Rest targets never lengthen or shorten on a note. | The table is fixed (audit §6). Adjusting rest around pain is treatment. `[Certain]` that this is outside the app's remit. |
| **Rule W1 calories** | **None.** | Pain is not a bodyweight or calorie signal, and there is no defensible number to change. `[Certain]` |
| **Z1 / Z2 / Z3** | **None on the data.** A flagged session's sets are stored, counted and compared exactly as any other. | The flag changes advice, never data. Same principle as `speedTooHeavy`. |

**Standing limit, restated because it is the one that matters.** The app may say two things about pain:
§10's fixed referral string, and S2b's factual `You logged pain in the last 7 days.` It may not grade
it, locate it, name a cause, recommend a stretch, a substitute exercise, a rep range, a rest change or
a deload because of it. If he wants to know what to do about the pain itself, the correct destination
is a physio or a doctor, and §10 already says so.

---

# 4. Raised and ruled — H1 case 2's increment (G1)

**Engineers will hit this on the same afternoon and it is not in my four questions, so I flag it loudly.**

Audit §9 case 2's copy is `All sets above 12. Go to 42.5 kg next session.` off a logged `30×20 ×3`.
**The audit states no formula, and `30 → 42.5` is not reproducible from any rule in it.** P1 case 3's
increment applied to the same numbers gives `32.5`. WO-003 §W6 has pinned `42.5` as an acceptance
criterion, so this must be settled by someone rather than guessed by whoever writes the branch.

The too-*heavy* direction has no gap: audit §9's `40 → 37.5` is exactly `round2p5(40 × 0.95)`, the same
as P1 case 1. Only the too-light direction is undefined.

```
Rule: G1 — the increment when a load is too light
Applies to:   P1 case 3 (k:"power") and H1 case 2 (k:"hyp"). Session verdict.
Inputs:       load = the working load (P1's min-of-C); ex.hi; C.
Logic:        excess = min(r in C) − ex.hi          // reps above the top of range
              step   = max(2.5, round2p5(load × 0.025 × excess))
              step   = min(step, 0.20 × load)       // never more than 20% in one jump
              next   = load + step
              At load 0: every multiplicative term is 0, so step = 2.5. This is
              the `Add 2.5 kg` in Z2 and Z3.
Output copy:  unchanged in shape; only the number differs.
              P1  case 3: `10 reps at 120 kg on every set. Too light. Go to 125 kg.`
              H1  case 2: `All sets above 12. Go to 35 kg next session.`
```

**Why this formula and not another.** It is not new — it is P1 case 3 generalised. P1 case 3 triggers at
`excess = 2` and prescribes `load × 0.05`, i.e. **2.5% of load per rep above the range**. G1 is that same
constant applied at any excess, so:

- SLDL `120×10 ×3`, `hi` 8, excess 2 → `120 × 0.05 = 6 → round2p5 → 5`; `max(2.5, 5) = 5`; cap
  `0.20 × 120 = 24`, not binding → **125 kg**. This reproduces audit §3 example 5 and WO-003
  Decision 5 exactly.
- Cable row `30×20 ×3`, `hi` 12, excess 8 → `30 × 0.025 × 8 = 6 → round2p5 → 5`; `max(2.5, 5) = 5`;
  cap `0.20 × 30 = 6`, not binding → **35 kg**.
- `60×13 ×3`, `hi` 12, excess 1 → `60 × 0.025 = 1.5 → round2p5 → 0`; floor applies → **62.5 kg**.
- Rack chin `0×13 ×3`, excess 1 → step 2.5 → **2.5 kg**, printed as `Add 2.5 kg next session.`

**The conflict, stated plainly.** G1 gives **35 kg** where WO-003 §W6 has pinned **42.5 kg**. I cannot
derive 42.5 from anything in the audit and I will not sign off a load increase I cannot derive.
`[Convention]` roughly 2.5–3% of load per rep is the standard field approximation in this rep territory;
a 42% jump on an accessory is not dangerous but it is a guess, and it will overshoot the 8–12 range and
land him in case 1 next week. **Recommendation to the PM: restate the W6 criterion to
`All sets above 12. Go to 35 kg next session.` and let QA pin G1.** If that is unwelcome, route it back
to me as a fifth question rather than letting `backend-engineer` pick a multiplier.

---

# 5. What changes, by work item

| WO-003 item | What this addendum adds |
|---|---|
| **W6** (P1 + H1 + B-32) | Z1 replaces the `w > 0 AND r > 0` parenthetical. Z2's `loadWord()` and three deltas. Z3's cases 4a–4d in the hypertrophy branch. I2's appendix on P1 3/4 and H1 2. G1's increment (pending the PM's call on the 42.5 criterion). |
| **W9 / W10** (ST1) | S2c, one appended line — deferrable, see the scope note. Defensive: a `w === 0` set contributes no e1RM, so an all-zero lift can never produce a `0 / 0` ratio. |
| **W11** (implements) | The 42-row table in I1. `implement === "db"` drives ` · per DB` and makes every printed kg per-dumbbell. The Trend legend stays `DB press` per W10's criterion — the per-DB statement lives on the session target line. |
| **W12 / W13** (SP1) | `R > 0` is required; a 0 kg source set does not qualify. S2a: the pain flag changes nothing on this card. |
| **W14 / W15** (V1) | S2b: one clause on the offer gate, `painWindow(...).active === false`; nothing stamped, nothing rolled back; the mid-session withdrawal rule; one line of copy. |
| **W16 / W17** (S1) | `PHAT.painWindow(sessions, todayStr, days)` is the new function S2 needs. §10's fixed string is untouched. |
| **W19 / W20** (D1) | Nothing. S2d: no interaction. D1's T1 comparison already works at load 0 — `0 === 0` and reps decide. |
| **W21** (suite) | New named tests: Z1 ×4, Z2 ×6, Z3 ×7, I1 (42-row tag snapshot + the five totals), I2 ×5, S2a ×3, S2b ×4, G1 ×4. The B-32 KNOWN-BAD test asserts `Stay at bodyweight until all 2 sets reach 10 reps.` **and** that the stored set is still `{w:0, r:10}`. |

---

## Verdict

**Sign off with changes**, the changes being the four rulings above plus G1. The four questions were all
real and all had a wrong default answer sitting in the code or the spec: the completeness test would
have deleted his rack chin from the advice layer, the hypertrophy branch would have told him "volume
matched" every Thursday for a year, the increment line would have printed the wrong rep number on 30 of
42 slots, and the pain flag would have kept offering him a new exercise in a week he reported pain.

One thing I will not do: assess the pain. Nothing above reads a note, grades a symptom, or designs
around one. The app stops adding load, stops adding exercises, says one factual sentence, and points
him at a physio or a doctor. That is the whole of it, and it is deliberate.

---

# 6. Rule TW1 — what counts as a training week

**Added 2026-09-09, after W1.** Two questions from `backend-engineer`, both mine. `trainingWeeks` gates
V1's reintroduction offer, ST1's minimum data and D1's T3 backstop, so an inflated count unlocks volume
early — the exact burial the weeks 1–4 block exists to prevent. That asymmetry decides both answers.

## 6a. Three sessions, or three distinct days? — **distinct days**

```
Rule: TW1 — the training-week count
Applies to:   PHAT.trainingWeeks(sessions, todayStr). Consumed by V1 (week 5
              offer gate), ST1 (trainingWeeks >= 6), D1 (T3 at 9), and the
              Train-screen tier and cycle lines.
              Supersedes nothing in docs/coach-audit.md — §4 says "weeks
              containing >= 3 logged sessions" and this defines "session"
              for that sentence.
Inputs:       sessions [{date:"YYYY-MM-DD" local, entries}]. No other input.
Logic:        qualifies(session) = it contains >= 1 completed set (Rule Z1)
                                   in any entry.
              For each local Monday-start calendar week from the first
              qualifying session's week to todayStr's week:
                n = the number of DISTINCT `date` values among that week's
                    qualifying sessions
                the week counts when n >= 3
              trainingWeeks = the number of weeks that count.
              Threshold unchanged at 3. It is 3 of the programme's 5 days.
Output copy:  none of its own. It is an input to V1's and D1's lines.
Not enough data: empty log -> 0. One qualifying session ever -> 0. A week in
              progress counts as soon as its third distinct date is logged;
              it is never counted in advance.
```

**Two sessions on one date count as one date.** This is the answer to both of the coordinator's cases:

- **The re-save.** Log a day, discard, log again — or, once B-05 exists, correct a session. Three
  saves, one day of training. Counting them as three is the app being told it has evidence it does not
  have. `[Certain]` — this is not a coaching judgement, it is a counting error.
- **The genuine two-a-day.** Counts as one day. `[Opinion]`, and I accept the cost. `trainingWeeks` is
  a proxy for *weeks of accumulated exposure*, not for session count or tonnage; the three gates it
  feeds are all about how long he has been at this, not how much he did. A two-a-day is also off the
  programme — the brief fixes five days, Mon/Tue/Thu/Fri/Sat — so this costs him nothing he is
  actually doing.

**The extra clause, and why it is here rather than in a separate rule.** A session with no completed
set anywhere in it — a save that carries only a note — is not a training day and must not count. Same
class of hole as the re-save, same one-line fix, and it is consistent with WO-003 Decision 7, which
already rules that an exercise is an exercise when it has at least one completed set. Note the
interaction with Z1: a session whose only sets are `0 kg` rack chins **does** qualify. That is
training.

**Worked examples.** Weekday alignment is real: `2026-09-07` is a Monday, `2026-09-06` a Sunday.

1. Normal programme week — `09-07 Mon`, `09-08 Tue`, `09-10 Thu`, `09-11 Fri`, `09-12 Sat`.
   5 distinct dates in one Monday-start week → **the week counts.** Nothing about a normal week
   changes under TW1.
2. **The W1 case.** Three sessions all dated `2026-09-07`. Distinct dates = 1 → **the week does not
   count.** Under the literal rule as implemented it does, and `trainingWeeks` would be 1 after a
   single day of training.
3. **Two-a-day.** Two sessions on `09-07`, one on `09-08`, one on `09-10`. Distinct dates = 3 →
   **the week counts.** The two-a-day is not punished; it is just not counted twice.
4. **Boundary.** Exactly 3 distinct dates → counts. `09-07`, `09-07`, `09-08` (2 distinct) → does
   not. `09-07`, `09-08`, `09-10` → does.
5. **Failing case.** `09-07` with sets, `09-08` with sets, `09-10` saved with a note and no completed
   set. Qualifying dates = 2 → **the week does not count.** The note is kept, stays visible and is
   never deleted (Decision 7); it just is not evidence of a training day.
6. Rack chin only — `09-07` `d1c 0×10, 0×9`, `09-08`, `09-10`, all with sets. Every date qualifies
   under Z1 → **the week counts.** A bodyweight session is a session.

**Rationale.** `[Certain]` three saves on one date is one day of training, and every gate downstream
reads the number as elapsed training time. The failure directions are not symmetric: undercounting
delays an accessory by a week, and overcounting hands him nine accessories, a stall verdict and a
deload prompt he has not earned the data for. `[Opinion]` when a metric is a proxy, count the thing it
is a proxy for — days he showed up — not the thing that is easy to count.

## 6b. The Monday straddle — **leave it as it is**

Sessions on Sun 6th + Mon 7th + Tue 8th produce **zero** training weeks: Sunday closes the previous
Monday-start week with 1 date, and Mon/Tue open the next with 2. Three sessions in three consecutive
days that buy nothing. **Ruling: correct as written. Do not switch to a rolling 7-day window.**

**Three reasons, in order of weight.**

1. `[Certain]` **his programme's week is already Monday-start.** The brief fixes Mon upper power,
   Tue lower power, Wed rest, Thu back & shoulders, Fri lower hypertrophy, Sat chest & arms, Sun rest.
   A normal week puts all five sessions inside one Monday-start week with room to spare. The straddle
   is only reachable by training on Sunday, which is off-programme, and by then doing so in a way that
   leaves both adjacent weeks below three days.
2. `[Certain]` **the fixed grid can only ever undercount relative to a rolling window**, never
   overcount — a rolling window finds every qualifying span the grid finds, plus more. So the error
   direction is the safe one at all three gates: it delays the accessory offer (holds reduced volume
   longer, which is the conservative side), delays the stall test (silence rather than a premature
   accusation), and delays only D1's T3 backstop, while T1 and T2 remain evidence triggers that fire
   on their own schedule.
3. `[Opinion]` **"how many weeks of training" must stay an integer he can verify by looking at a
   calendar.** A rolling definition needs greedily packed disjoint 7-day blocks anchored on the first
   session, which produces a number he cannot reproduce in his head and which shifts as history is
   edited. A gate he cannot audit is a gate he will not trust.

**The surprise is already handled, and it must not be dropped.** V1's copy exists for exactly this:

```
Week 5 by the calendar, week 3 of real training. Reduced volume holds.
```

That line is what stops the straddle reading as a bug. It is specified in audit §5 and pinned in
WO-003 §W14. **Whatever the new visual design does, that line stays** — if the calendar week and the
training week can differ, the screen must show both or the number looks broken.

**Worked examples**

7. **The straddle.** `09-06 Sun`, `09-07 Mon`, `09-08 Tue`, all qualifying. Week ending `09-06`: 1
   date. Week `09-07`–`09-13`: 2 dates. → `trainingWeeks` = **0.** Correct, deliberate, and the tier
   line says `week 0 of real training`.
8. **Partial first week.** He starts on `09-10 Thu` and logs Thu, Fri, Sat. 3 distinct dates in the
   week beginning `09-07` → **1.** Starting on a Friday and logging Fri + Sat gives 2 dates → **0**,
   and the first week is simply not banked. Conservative and correct.
9. **Boundary against 6a.** `09-06 Sun`, `09-07 Mon`, `09-08 Tue`, `09-10 Thu`. Week `09-07`–`09-13`
   now has 3 distinct dates → **1.** The Sunday still contributes nothing. Nothing is lost
   permanently; the count simply requires three days inside one Monday-start week.

## 6c. The same principle, in the two other places rules count sessions

Same bug, same fix, ruled here so it is not re-raised twice. **Wherever a rule counts sessions as
evidence, it counts distinct local dates.**

| Rule | Reads | Ruling |
|---|---|---|
| **ST1** (audit §4) | ">= 2 sessions of that lift in each block" | **Distinct dates.** Two entries for Squat on one date is one data point, not two, and it must not satisfy the block minimum. Otherwise a single re-saved session unlocks a stall verdict. |
| **D1 T1** (audit §8) | "two CONSECUTIVE sessions" failing at a previously completed load | **Distinct dates, consecutive in date order** among that lift's qualifying sessions. A correction saved alongside the original is not two consecutive failures. |
| **D1 T3** | "9 consecutive trainingWeeks" | Inherits TW1 unchanged. |
| **H1 / Z3 / P1** | the *previous* entry, via `lastFor` | **No change.** `lastFor` wants the most recent entry, not a count; if two exist on one date the later one in sorted order is the right answer, which is what W1's stable sort already gives. |
| **Rule W1** (bodyweight) | ">= 5 distinct dated entries" in each 7-day window | **Already correct** — audit §2 says *distinct dated entries* and says it for this exact reason. No change. |

**Rationale.** `[Certain]` a duplicate row is not a second observation. Every one of these thresholds
exists to answer "do I have enough evidence to say something confident", and B-05 is still open, so
corrections will arrive as extra rows before they arrive as edits. The rule that survives B-05 landing
is the one that counts days.

## 6d. What this changes

| WO-003 item | Change |
|---|---|
| **W1** | `trainingWeeks` counts **distinct qualifying dates** per Monday-start week, threshold 3. A session qualifies when it holds >= 1 completed set (Z1). Week boundaries unchanged. |
| **W9** | ST1's per-lift block minimum counts distinct dates. |
| **W19** | D1's T1 walks distinct dates in date order. T3 inherits TW1. |
| **W14 / W15** | No engine change. The `Week 5 by the calendar, week 3 of real training.` line is now load-bearing and may not be cut in the redesign. |
| **W21** | New named tests: TW1 examples 1–9, plus one ST1 test (same lift twice on one date does **not** meet the 2-session block minimum) and one D1 test (a duplicate save is not the second of two consecutive failures). WO-003 §W1's existing criterion `trainingWeeks` over 5 weeks of 5 sessions = 5 still holds, because those are 5 distinct dates each. |

**On the redesign.** Everything in this file is engine-level and renders identically under any visual
treatment — the only design-dependent item is 6b's calendar-vs-training-week line, which is a sentence,
not a layout. Nothing here needs to wait for the new design, and nothing here should be simplified to
suit it. The one thing I will keep saying: the measure of this batch is still one logged Upper Power
session with a correct verdict under it, and a redesign is another tool, not a session.
