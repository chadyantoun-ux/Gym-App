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

---

# 7. Sign-off pass on the WO-003 engines

**Added 2026-09-10.** Answers the six items `backend-engineer` flagged as gaps it filled. Judged on the
strings and the rules only; the frontend is on hold and no layout is assessed here.

**Verdict: sign off with changes.** Four of the six are right as built. Two are wrong — item 3's banner
contradicts item 3's card, and item 6 fires a deload off a session the app cannot read. Both are the
wrong-advice class this batch exists to close, and neither is a code defect: they are places where my
audit was under-specified and the fill was reasonable. Plus four new findings the six questions walked
past, one of which is the worst thing in the deload feature.

## 7.0 Rulings at a glance

| # | Item | Ruling |
|---|---|---|
| 1 | T2's copy | **Amend.** Drop `have both/all stalled` for `No progress on …` — ST1's own vocabulary for the same finding. One fewer branch. Rollback line pinned as a second line. |
| 2 | T2 suppressed until ST1's recent block clears the deload | **Approve, unchanged.** `entirely after` is correct and partial overlap is actively harmful. Reasoning below is stronger than backend's. |
| 3 | `deloadEx` applies `hi − 2` to power only | **Card is right, banner is wrong.** Power-only is what I meant and it is correct. `D1_TAIL` and `D1_ACTIVE_TAIL` must say so. |
| 4 | `verdict` gates on the deloaded set count | **Confirm** — and it matters more than backend thinks, because of N1. |
| 5 | T1's `at a load previously completed` = `≥ the failing load`, not equality | **Confirm.** That is the intent, stated. |
| 6 | `fail, abandoned, fail` fires T1 | **Reject.** An abandoned date is not a failure *and* it is not invisible. It breaks the streak. Rule **E1**. |
| N1 | The verdict during a deload week recommends **more weight** | **New, P1.** Rule **DL1**. |
| N2 | Deload sessions are evidence to ST1 and T1 | **New, P1.** Rule **E2**. |
| N3 | H1 says `First time logged` after any short session | **New, P2.** Amendment to H1 case 3. |
| N4 | T1 has no recency bound at all | **New, P2.** Clauses in **E1**. |

---

## 7.1 Item 1 — T2's copy: **amend**

The literal built is defensible and I would ship it before I would ship nothing. Two changes.

**Change A — vocabulary.** ST1 tells him `Week 7 and no progress on Row, Squat.` on the Trend tab.
The T2 banner tells him `Row and DB press have both stalled.` on the Train tab. Same finding, same
day, two words for it. That is the B-44 failure in miniature: one app, two vocabularies, and he has
to work out they are the same thing. ST1's wording is fixed by the brief and cannot move, so the
banner moves. `[Opinion]`, and I hold it — consistency of terms is not decoration when the two screens
are describing one event.

**Change B — delete the `both` / `all` branch.** It buys nothing and it is a second string to get
wrong. `No progress on Row and DB press` and `No progress on Row, DB press and Squat` need no
grammatical switch.

```
Rule: D1-T2 copy
Applies to:   the Train-screen deload banner, trigger T2 only.
Inputs:       stallReport.stalled (>= 2 names), rollbackReintro's named exercise.
Logic:        text = "No progress on " + andList(stalled) + ". " + D1_TAIL
              Rendered as TWO lines when rollback is true. Line 2 is V1's own
              existing rollback string, never a new one, and never joined to
              line 1's sentence.
Output copy:  2 lifts:  `No progress on Row and DB press. Take a deload week: same weights, 2 sets. On power days stop 2 reps short. Resume where you left off.`
              3 lifts:  `No progress on Row, DB press and Squat. Take a deload week: same weights, 2 sets. On power days stop 2 reps short. Resume where you left off.`
              line 2:   `Progress stalled. Pulling Upright row back out for now.`
Not enough data: T2 cannot fire below trainingWeeks 6, and ST1 returns empty
              lists when it is not testable. Nothing renders.
```

Note `andList` gives `Row and DB press` where ST1's headline gives `Row, Squat`. That divergence is
deliberate and I accept it: the banner is a sentence and the warning is a headline. `[Opinion]`

**Worked examples**

1. `stalled = ["Row","DB press"]`, week 9, rollback pulls `Upright row` → the two lines above, in that
   order. Audit §8 example 3 requires both statements and this is what "both should be stated" meant.
2. **Boundary.** `stalled = ["Row"]` → T2 does not fire at one lift. Falls through to T3.
3. **Failing case.** `stalled = ["Row","DB press"]` but `reintro` is all zeros, so nothing can be pulled
   back out. Line 1 renders, line 2 does not. The banner must not print a rollback line naming nothing.

---

## 7.2 Item 2 — T2 after a deload: **approve, `entirely after` is right**

The suppression is correct and the boundary is correct. Backend's stated reason — "the report is still
reading the weeks that produced the recommendation" — is true but it is the weaker half of the argument.
The decisive one:

`[Certain]` **a deload week's sets have a systematically lower estimated 1RM than the weeks around
them, by construction.** The prescription is the same weight, stopping 2 reps short of `hi`. On a
3–5 power lift that is 100 × 3 where he was doing 100 × 5: Epley 110.0 against 116.7, **5.7 % lower**
— more than twice ST1's 2.5 % progress threshold. ST1 takes the *max* of each block, so deload sets are
harmless while the block also holds normal weeks, and they dominate the block the moment it does not.

So partial overlap is not merely eager, it is **the B-07 failure re-created one layer up**: a recent
block that is mostly deload week reports a stall manufactured by the deload the app itself recommended,
and then blames his effort or his diet for it. That is the exact sentence this batch exists to stop
printing. `entirely after` is the only boundary that guarantees no deload set is in the pool.

The cost is a 21-day silence on T2 after a deload ends (`today − 20 > deloadEnd`). I accept it. During
that window T1 and T3 still run, so a genuine collapse is still caught, and the conservative failure
direction on a *deload recommendation* is late, not early — audit §8 already ruled that a deload that
fires without earned evidence teaches him to ignore the banner, which costs the one that matters later.

**Approve unchanged.** No new constant was invented and none should be. But see **E2** in §7.7 — the
same problem exists on the Trend tab, where backend's fix does not reach, and that one is not cosmetic.

---

## 7.3 Item 3 — `hi − 2` on power only: **the card is right, the banner is wrong**

I meant power only. Audit §8's content block names the rep change under *Power days* and gives
hypertrophy days `2 sets per exercise, all cut:1 accessories out` with no rep change. `deloadEx`
implements what I wrote. Confirming it, with the reasoning I did not give at the time:

`[Opinion]`, strongly held — **`hi − 2` is not a meaningful instruction on a hypertrophy slot.** On a
3 × 8–12 exercise it prescribes 10 reps, which is inside the range he was already working in; on a
15–20 slot it prescribes 18. Neither reduces the effort of the set, because the load is unchanged and
he will take a 10-rep set to the same proximity to failure he took the 12. The lever that actually
reduces fatigue on a hypertrophy day is **set count and exercise count**, and the deload already cuts
both — three sets to two, and every `cut:1` accessory out. `[Certain]` the other lever, proximity to
failure, is an RIR judgement the app does not measure and must not start inferring from a rep number.

Second reason, engineering-visible: moving `hi` on a hypertrophy slot moves H1 case 2's trigger with
it. At `hi = 10` an 11-rep set on an 8–12 exercise would print `All sets above 10. Go to 45 kg next
session.` **during a deload week.** One wrong number begets another.

**So the card stays as built. The banner changes**, because right now it states a prescription the card
does not give, and he can see both on the same day.

```
Rule: D1 deload content copy
Applies to:   D1_TAIL (all three trigger banners) and D1_ACTIVE_TAIL.
Logic:        The rep clause is scoped to power days, because the prescription is.
Output copy:  D1_TAIL        -> `Take a deload week: same weights, 2 sets. On power days stop 2 reps short. Resume where you left off.`
              D1_ACTIVE_TAIL -> `Same weights, 2 sets. Power days stop 2 reps short. Do not chase numbers this week.`
              Active line in full: `Deload week, day 3. Same weights, 2 sets. Power days stop 2 reps short. Do not chase numbers this week.`
```

**This moves four pinned acceptance criteria** — WO-003 §W19's T1 and T2 strings, §W20's day-3 string,
and any test QA has already written against them. Flagged deliberately so it is a restated criterion and
not a surprise red test. The rule did not change; the sentence describing it became accurate.

**One rendering note for the redesign, not a rule.** On a 3–5 power slot the deloaded exercise is
`{s:2, lo:3, hi:3}`. The target line must render `2 × 3`, not `2 × 3–3`.

---

## 7.4 Item 4 — the verdict gates on the deloaded set count: **confirm**

Confirmed, and it is the right call for the reason given: gating on 3 while prescribing 2 would withhold
his verdict for seven days, which is the app going quiet in the week he is most likely to wonder whether
he is wasting his time. Pass the deloaded `ex` to the card and to the verdict, one object, no divergence.

Three consequences I am accepting on the record:

1. A deload week produces verdicts computed over **2 sets**. Correct: 2 sets *is* the prescription that
   week, and P1's working load is "the weight he held for every prescribed set", not for every set in
   the programme's normal week.
2. A third set logged anyway is **ignored by the verdict and still saved**. Correct, and it is the same
   principle as audit §3's "extra sets beyond `ex.s` are ignored". The deload changes what he is asked
   for, never what he did.
3. Those verdicts feed nothing downstream — provided **E2** lands. Without E2 they do feed something:
   a 2-set deload session becomes evaluable evidence to T1 at `s = 2`, and to ST1 as an e1RM sample.
   See §7.7. `verdict` itself is a leaf and writes nothing; the exposure is that the *deloaded* `ex`
   must never be the object handed to `deloadCheck`'s `keyLifts`. `d1T1` reads `lift.s` and `lift.lo`
   from the caller, and if the caller passes deloaded lifts the whole T1 evidence ladder shifts under it.

**Confirm, with one binding constraint:** the deloaded `ex` goes to the card and to `verdict`, and to
nothing else. `deloadCheck`, `stallReport`, `speedLoad` and `volumeTier` read `PROGRAM`.

---

## 7.5 Item 5 — `at a load previously completed`: **confirm**

Confirmed. `≥ the failing load`, not equality, is the intent.

- Failing at 120 having previously completed 125 **must** fire. It is the cleanest regression signature
  there is: a load he has demonstrated he owns, and he no longer owns it. Requiring exact equality would
  make T1 miss the most obvious case in favour of the narrowest one.
- Failing at a **new heavier 140** must not fire. `[Certain]` that is not a regression, it is an attempt.
  Missing a jump is what a jump is for, and P1 case 1 already handles it correctly and locally by
  telling him to drop 5 %. A deload recommendation for a failed PR attempt would be absurd.

Two implementation details I am also confirming, because they are load-bearing and easy to "tidy" away:

- `best` is the running max of *earlier* dates only. A load completed **after** the failure does not
  make the failure retroactively count. "Previously" means previously.
- A date is a failure only when **every** evaluable entry on it failed, and complete when **any** entry
  on it completed. That is addendum 6c and it survives B-05 landing, where corrections arrive as extra
  rows before they arrive as edits.

One amendment attaches here rather than being a separate finding — see **E1** clause (c): `best` never
decays, so a load he completed a year ago still counts. That is wrong after a layoff and is bounded below.

---

## 7.6 Item 6 — `fail, abandoned, fail`: **reject**

This is the one to attack first and backend was right to say so.

**Ruling: an abandoned date is not a failure, and it is not invisible either. It breaks the streak.**

Backend's framing — is it evidence he is beaten up, or is it noise — is the right question and the
answer is **neither, and that is the point.** Take it in two halves:

`[Certain]` **it is not an observation of the thing T1 measures.** T1's claim is "he could not complete
the prescription at a load he has already completed". One logged set of three tells you nothing about
whether he could have completed three. The current code is right to refuse to score it as a failure.

`[Opinion]`, and this is the half backend filled the other way — **it does not follow that it should be
skipped over.** "Two consecutive sessions" in audit §8 means adjacent *in his training*, not adjacent
*among the dates the app happened to be able to read*. `fail, abandoned, fail` is not two consecutive
failures. It is two failures with an unknown between them, and the correct response to an unknown is to
get another data point, not to prescribe a week of reduced stimulus off the two either side of it.

The "conservative direction" argument does not rescue the skip, because a deload is not free in this
app's economy. Audit §8 already ruled that a deload recommended on evidence he has not earned teaches
him to ignore the banner, which costs the one that matters later. And with zero sessions logged and
B-05 still open, the **most likely** cause of a half-logged date here is not fatigue — it is a logging
artifact: a draft restored and finished elsewhere, a Save tapped early, a session he will want to
correct and cannot. Firing a programme-level recommendation off a logging artifact is precisely the
B-06/B-07 class.

And note what the copy would say: `Two sessions where Squat went backwards.` If one of them was
abandoned after a set, he did not have two sessions of squat. The app would be describing something
that did not happen.

```
Rule: E1 — T1's evidence ladder
Applies to:   Rule D1 trigger T1 only, on the four key lifts. Engine only.
              Supersedes d1Rows' current "half-finished dates are SKIPPED".
Inputs:       sessions; the key lift's PROGRAMME s and lo (never a deloaded s);
              todayStr; the last deload end date. Distinct local dates only
              (addendum 6c). Minimum: trainingWeeks >= 6, unchanged.
Logic:        Walk, ascending, every distinct date on which that exercise id
              holds >= 1 completed set (Rule Z1). Dates on which the lift was
              not logged at all are not rows. Deload dates are not rows (E2).
              Classify each date:
                COMPLETE  some entry on it holds >= s completed sets and all of
                          its first s sets reach lo.
                SHORT     no entry on it holds >= s completed sets.
                MISS-NEW  >= s completed sets, some set below lo, at a working
                          load ABOVE every previously completed load.
                FAIL      >= s completed sets, some set below lo, at a working
                          load <= a previously completed load (item 5).
              Then:
                FAIL      -> run += 1;  fires at run >= 2
                COMPLETE  -> run = 0
                SHORT     -> run = 0    <-- THE CHANGE
                MISS-NEW  -> run = 0
              Recency, all three clauses required to fire (N4):
                (a) the two failing dates are <= 20 days apart      [ST1_RECENT]
                (b) the later failing date is within 20 days of today
                (c) the previously completed load used in the FAIL test was
                    completed within 41 days of the later failing date
                                                              [ST1_PRIOR_FROM]
              No new constant. All three reuse ST1's own window.
Output copy:  unchanged — the T1 banner, per §7.1's amended tail.
Not enough data: a lift with no COMPLETE date has no previously completed load,
              so it can produce no FAIL and T1 cannot fire on it. Silent, no
              placeholder. A lift with only SHORT dates is silent likewise.
```

**Worked examples** — Squat `{s:3, lo:3, hi:5}`, `trainingWeeks` 8, no deload.

1. **`fail, abandoned, fail` — the case asked about.** `05-04` 120×5/5/5 COMPLETE (best 120).
   `05-11` 120×2/2/2 FAIL (run 1). `05-18` 120×5 and nothing else logged → **SHORT → run 0.**
   `05-25` 120×3/2/2 FAIL (run 1). → **no trigger.** Today: fires, off two failures with a session
   between them the app cannot read.
2. **`fail, abandoned, success`.** Same through `05-18`. `05-25` 120×5/5/5 → COMPLETE → run 0.
   → **no trigger**, under both the old rule and the new one. This case was never the problem; it is
   here because it proves the change is narrow — E1 alters exactly one classification.
3. **The true positive, unchanged.** `05-04` 120×5/5/5, `05-11` 120×2/2/2, `05-18` 120×3/2/2 →
   FAIL, FAIL adjacent → **T1 fires.** E1 must not break this, and it does not.
4. **Boundary.** `fail, abandoned, fail, fail`: run goes 1 → 0 → 1 → 2 → **fires on the third and
   fourth.** He gave the app the second data point and the second data point agreed. Correct.
5. **Failing case, item 5's other half.** `05-04` 120×5/5/5, `05-11` 130×2/2/2, `05-18` 130×2/2/2.
   Both fails are at 130, above the best completed 120 → MISS-NEW → run resets each time →
   **no trigger.** Two missed attempts at a new weight is a fortnight, not a deload.
6. **Failing case, N4 clause (a).** `03-02` 120×2/2/2 FAIL, then nine weeks of SHORT and untouched
   dates, then `05-11` 120×2/2/2 FAIL. Under E1's classification the SHORT dates already reset the
   run. Had they all been untouched dates instead — he simply did not squat — the run would survive
   and clause (a) stops it: 70 days apart. **No trigger.** Audit §8 example 5 says absence is not
   fatigue; without (a) the rule said it only for a single session.

**Rationale.** `[Certain]` a session with fewer than the prescribed sets is not an observation of
whether the prescription could be met, and the app cannot tell "I bailed, the bar felt like lead"
from "the gym shut" from "I tapped Save early" out of the stored data. `[Opinion]` when the app cannot
tell, it declines rather than picks the interpretation that lets it say something — the same principle
as §10's refusal to assess pain and W1's refusal to average eight weigh-ins over 24 days.

**The cost, stated honestly.** A lifter who is genuinely wrecked and bails after one set every week
will never trigger T1. I accept it: ST1 still reads those sets (they contribute e1RM without needing a
full prescription), T3's nine-week backstop still fires, and the T1 copy would have been describing
sessions he did not do. **I am deliberately not building a "repeated abandonment" trigger.** It would
be a new signal, off thin data, calibrated on a log containing zero sessions. Raise it again after
there are twelve weeks of real history, or never.

---

## 7.7 Four findings the six questions walked past

### N1 — the verdict during a deload week recommends **more weight**. Rule DL1. `[Certain]`, P1

`deloadEx` sets `hi = max(lo, hi − 2)`, so a squat becomes `{s:2, lo:3, hi:3}`. He does what the banner
told him — 100 × 3, 100 × 3 — and `verdictPower` case 4 (`minRep >= hi`) fires:

```
Top of range on all 2 sets. Go to 102.5 kg next session.
```

**In the middle of a deload week, at a man who did exactly what the app instructed.** This is B-07's
failure mode with a load recommendation attached instead of a warning, and it is worse, because he
can act on it with a barbell. It is reachable on every power slot of every deload week and it is a
direct consequence of items 3 and 4 being correct — the two right answers combine into a wrong output,
which is why neither owner saw it.

The rest of the branch is wrong in the same week for smaller reasons: case 5's hold copy would read
`Stay at 100 kg until all 2 sets reach 3 reps`, which describes a progression target that does not
exist; case 1 would tell him to `Drop to 95 kg next session`, contradicting the deload's own
`Do not reduce the weight`; and H1 case 4 would compare a deliberately reduced block to a full one and
say `Add a rep or 2.5 kg next time`.

Do not patch four branches. Replace the output.

```
Rule: DL1 — the verdict during an active deload week
Applies to:   k:"power" and k:"hyp". Session screen verdict. k:"speed" is
              unchanged, as the deload leaves speed work unchanged (audit §8).
Inputs:       ctx gains `deload:Boolean` — true when deloadStatus().active is
              true for todayStr. Threaded exactly like ctx.painFlag, which is
              the same mechanism and the same reason.
              Minimum: unchanged. Completed sets >= the DELOADED ex.s (item 4).
Logic:        deload === true -> return the fixed line below. No P1 case, no
              H1 case, no I2 appendix, no comparison, no percentage.
              Working load = min of the first ex.s completed sets, as always,
              printed through loadWord() (Rule Z2).
              A pain note still renders its own §10 notice on the card; DL1 does
              not suppress it and does not repeat it.
Output copy:  `Deload week. Stay at 100 kg. Nothing to add until full sets resume.`
              zero load: `Deload week. Stay at bodyweight. Nothing to add until full sets resume.`
Not enough data: below the deloaded ex.s, render nothing. B-24's gate is
              unchanged and outranks this rule.
```

**Worked examples**

1. Squat, deload active, `{s:2, lo:3, hi:3}`, logged `100×3, 100×3` → `Deload week. Stay at 100 kg.
   Nothing to add until full sets resume.` Today: `Top of range on all 2 sets. Go to 102.5 kg next
   session.` **This is the test that must exist.**
2. **Boundary.** Same session, one set logged → `null`. The gate fires before DL1.
3. **Failing case.** He ignores the deload and grinds `100×5, 100×5` → still the DL1 line. Case 3
   ("too light", `minRep >= hi + 2` = 5) is suppressed. Correct: doing more than a deload asks is not
   evidence that the load is light, and rewarding it with +5 kg trains him to ignore deloads.
4. Rack chin at bodyweight during a deload, `0×10, 0×10` → `Deload week. Stay at bodyweight. Nothing to
   add until full sets resume.` The substring `0 kg` does not appear (Z2 holds).

**Rationale.** `[Certain]` meeting a prescription that was deliberately set below his capacity is not
evidence he is ready to add load; the whole content of a deload is "same weights, less of it", and any
verdict that moves a number contradicts the instruction that produced the session. `[Opinion]` one
fixed line rather than four downgraded branches, because a deload week's verdict has nothing to decide
and the app should say so in one sentence rather than perform a calculation with no consequence.

### N2 — deload sessions are evidence to ST1 and T1. Rule E2. `[Certain]`, P1

Backend's item-2 suppression protects the **deload banner**. It does not protect the **Trend tab**,
which is where the same wrong sentence is actually printed. In the fortnight after a deload ends,
ST1's recent block is one deload week plus the two stalled weeks that triggered it, and it will report:

```
Week 12 and no progress on Row, Squat.
… Either the sets aren't close enough to failure, or you aren't eating enough.
```

The sets were not close enough to failure **because the app told him to stop two reps short.** That is
the app blaming him for obeying it, which is the defect B-07 exists to close, arriving through a door
B-07 did not know about.

```
Rule: E2 — a deload date is not evidence
Applies to:   ST1 (both blocks, and its distinct-date minimums) and D1 trigger
              T1 (E1's ladder). Engine only.
Inputs:       the deload windows: every [startDate .. endDate] in state.deload
              plus state.deload.past. Implied end dates count (deloadStatus
              already derives them).
Logic:        A session whose date falls inside any deload window contributes:
                - no e1RM sample to either ST1 block
                - no distinct date to either block's >= 2 minimum
                - no row to E1's ladder: not COMPLETE, not FAIL, not SHORT.
                  It does not reset the run and it does not extend it. A deload
                  date is skipped entirely, which is what the current code does
                  for short dates and should not.
              NOT applied to Rule SP1. R is the heaviest set at 3-5 reps and a
              deload does not lower the weight, so a deload set is a valid
              observation of load; excluding it could drop a real number to the
              no-data fallback, which is the worse error.
              NOT applied to Rule TW1. A deload week is a week he trained.
Output copy:  none of its own. If exclusion drops a lift below ST1's 2-date
              minimum, it lands in `untested` and prints the existing string:
              `Not enough sessions on Row to judge. Log it weekly.`
Not enough data: covered by the line above. ST1 saying nothing for two weeks
              after a deload is the correct output.
```

**Worked examples**

1. Deload `06-01`–`06-07`. Today `06-10`. ST1's recent block `[05-21 .. 06-10]` holds 2 pre-deload Row
   dates and 2 deload Row dates. Under E2 the deload dates drop out; 2 remain, the minimum is met, and
   the max is drawn from real weeks. Same answer as before the deload, honestly obtained.
2. **The case E2 exists for.** Same deload, today `06-12`, and the only Row dates in the recent block
   are the two deload ones at `100×3`. Under E2: 0 qualifying dates → `Row` is `untested`, no stall
   warning. Without E2: block max 110.0 against a prior 116.7, ratio 0.943 → **`Row` reported stalled**,
   with the effort-or-diet attribution, off a week the app prescribed.
3. **T1.** Deload `06-01`–`06-07`. He logs `120×2/2/2` on `06-03`, below `lo` 3, at a load he has
   completed. Without E2 that is a FAIL row. Under E2 it is not a row at all. Correct: the app told him
   not to chase numbers that week, and it may not then read the result as weakness.

**Rationale.** `[Certain]` a deload prescribes submaximal work, so its sets measure compliance, not
capacity, and feeding them to a capacity test guarantees a false negative. `[Opinion]` skip rather than
reset in E1's ladder, unlike an abandoned date: an abandoned date is an unknown, and a deload date is a
known non-attempt. Different facts, different handling.

### N3 — `First time logged` after any short session. `[Certain]`, P2

`verdict` computes `Cprev` and H1 case 3 fires when `Cprev.length < ex.s`, printing
`First time logged. This becomes your baseline.` The previous entry is not missing — it is short. This
fires the whole week after every deload (2-set entries against a restored `s` of 3) and after every
abandoned session, on an exercise with months of history. The string is simply false.

**Amendment to Rule H1, case 3. Split it.**

```
3a. No previous entry at all              -> `First time logged. This becomes your baseline.`   (unchanged)
3b. Previous entry exists but holds fewer
    than ex.s completed sets              -> `Last logged session was short. Not comparable. This becomes your baseline.`
```

**Worked examples**

1. Seated cable row 3 × 8–12, no history → 3a, unchanged.
2. Previous entry `60×10, 60×10` (2 sets), this session `60×10 ×3` → 3b. Today: `First time logged.`
3. **Boundary.** Previous entry `60×10 ×3` and this session `60×10 ×3` → neither 3a nor 3b; the
   tonnage comparison runs. E2 does not apply — this is display of history, not a capacity test.

`[Opinion]` on refusing the alternative: do not "look further back" for a comparable entry. Comparing
this week to a session three weeks old and labelling it `Volume up 4%` is a comparison across a gap the
copy does not disclose. Declining is correct and it is one string.

### N4 — T1 has no recency bound. `[Likely]`, P2

Folded into **E1** as clauses (a), (b) and (c) rather than given its own rule, because it is the same
walk. Two failures 70 days apart currently read as consecutive if nothing evaluable sits between them,
and `best` never decays, so a load completed a year ago still qualifies a failure today. The concrete
bad output: he trains for six weeks, stops for six months, comes back, has two hard weeks — and the app
recommends a deload. `[Certain]` that is detraining, not fatigue, and a deload is the wrong answer to
it. All three clauses reuse ST1's existing constants; no number is invented.

---

## 7.8 What this changes, by work item

| Item | Change |
|---|---|
| **W19** | `D1_TAIL` and `D1_ACTIVE_TAIL` rewritten (§7.3) — **four pinned criteria move.** T2's text loses the `both`/`all` branch and reads `No progress on …` (§7.1). `d1Rows` gains SHORT rows that reset the run, and E1's three recency clauses (§7.6). E2's deload-window exclusion in the ladder (§7.7). |
| **W9** | E2: deload dates contribute no e1RM sample and no distinct date to either ST1 block (§7.7). This is a **P1 wrong-advice fix**, not a tidy-up. |
| **W5 / W6** | `ctx.deload` threaded exactly as `ctx.painFlag` is; Rule DL1 short-circuits the power and hypertrophy branches (§7.7 N1). H1 case 3 splits into 3a / 3b (§7.7 N3). |
| **W12 / W14** | Nothing. E2 explicitly does not reach SP1 or TW1, and says why. |
| **W20** | The banner renders T2 as two lines, deload text then V1's rollback line, in that order (§7.1). The deloaded target line renders `2 × 3`, not `2 × 3–3` (§7.3). |
| **W21** | New named tests: E1 examples 1–6 (example 1 is the headline), DL1 examples 1–4 (example 1 is the headline), E2 examples 1–3 (example 2 is the headline), H1.3b, and the four restated D1 copy criteria. |

## 7.9 Verdict

**Sign off with changes.** Items 2, 4 and 5 are approved as built and item 1 needs two copy changes.
Item 3 is right in the engine and wrong in the banner. Item 6 is rejected: `fail, abandoned, fail`
must not fire, because two failures either side of a session the app cannot read are not two
consecutive failures, and a deload recommended on that is the banner spending credibility it will need
later.

The four findings matter more than the six questions. **N1 is the serious one:** as the engines stand
today, a deload week tells him `Top of range on all 2 sets. Go to 102.5 kg next session.` for doing
exactly what the deload banner asked. That is a load recommendation produced by obedience, and it is
the same defect this whole batch was written to close, reassembled out of two correct decisions.

**Standing note, made for the third time and still true.** Nine rule engines are built. The log
contains **zero of Chady's sessions.** Every rule in this file is calibrated against a brief and an
empty store, and every one of them would be sharper after twelve weeks of real history than after
another review. The measure of WO-003 is still one logged Upper Power session with a correct verdict
under it. It is his call, but the bottleneck has not moved.

---

## 7.10 E1 clause (c), disambiguated — **reading B confirmed**

**Added 2026-09-10, after implementation.** Clause (c) had two readings. Backend implemented **B**.
**B is correct and it is what the clause meant.** Restating it so it cannot be re-read as A:

```
E1 clause (c), restated
Logic:        For the FAIL test on a failing date F, `best` is the maximum
              working load over that lift's COMPLETE dates that are
              BOTH strictly earlier than F
              AND on or after F - 41 days                  [ST1_PRIOR_FROM]
              A date is FAIL when its working load <= that windowed best.
              A completion outside the window is not consulted, in either
              direction: it neither qualifies a failure nor silences one.
```

**Why B, not A.** `[Certain]` on the direction. A gates the all-time max on its own date, so a lifter
who *also* owns an older, heavier PR is silenced by owning it. Two men fail 120 kg twice this month;
both completed 120 kg ten days ago; the one who happened to hit 125 kg last year gets nothing and the
one who never did gets the trigger. Same present-day evidence, opposite outputs, decided by history
that has no bearing on whether he can do 120 kg today. That is backwards, and it would make T1 miss
what §7.5 calls the cleanest regression signature there is.

The 41-day window is `[Convention]` — a reuse of ST1's prior block, chosen so no number is invented.
What it encodes is "a load he has recently demonstrated", and a demonstration from a year ago is not
one.

**Worked examples**

1. **The case that separates the readings.** Completed 125 kg twelve months ago; completed 120 kg ten
   days ago; fails 120 kg on two consecutive evaluable dates. Windowed best = 120. Fails at 120 ≤ 120
   → **T1 fires.** Reading A: `best` = 125, stale, → silent. B is right.
2. **B is not uniformly more sensitive.** Completed 140 kg a year ago; the only completion in the
   window is 100 kg; he now fails at 120 kg twice. Windowed best = 100, and 120 > 100 → **MISS-NEW,
   run resets, no trigger.** Correct: he has not recently demonstrated 120 kg, so failing it is an
   attempt, not a regression. Both readings are silent here, for different reasons, and B's reason is
   the honest one.
3. **N4 unchanged.** Six weeks of training, six months off, two failing weeks back. No completion
   inside 41 days of either failing date → no windowed best → no FAIL row → **no trigger.** Both
   readings agree, as backend says. Detraining is not fatigue and a deload is not the answer to it.
4. **Ordering preserved.** A completion on the *same* date as the failure, or after it, is never
   `best`. "Previously" still means strictly earlier (§7.5).

## 7.11 Three implementation calls — all three approved

**1. `deloadCheck` refuses on deloaded lifts: approve.** `{trigger:null, reason:"deloaded-lifts"}` is
the right answer. A key lift arriving with `s = 2` is a caller wiring bug, and answering off an `s = 2`
evidence ladder would silently redefine what a completed prescription is — the same class as DL1.
All-or-nothing refusal is also right: if one lift arrived deloaded the whole call is untrustworthy, not
that lift.

Two constraints on it. `[Certain]` **this reason must never render user-facing copy.** It is a
developer signal about a bug in the caller, not a fact about his training, and there is no honest
sentence to print. The banner is absent, exactly as at `reason:"early"`. And it must stay distinct from
`reason:"active"`, which is the ordinary state during a real deload week and is reached first. QA
should carry one named test asserting the banner is absent and no string is produced.

**2. `Cprev.length === 0` routes to H1.3a: approve.** Correct reading of N3. 3b's copy asserts
`Last logged session was short`, and an entry that recorded no completed set is indistinguishable from
no entry at all — it may be a notes-only entry, which WO-003 Decision 7 and TW1 both treat as not a
training record. Claiming it was "short" would be the app describing a session it cannot see. 3a's
`First time logged` is true of the thing being compared: no set has ever been logged for that exercise.
The split is `Cprev.length === 0` → 3a; `0 < Cprev.length < ex.s` → 3b.

**3. A corrupt deload record collapses to the start date: approve, with one rider.** The failure
direction is right — E2 *excludes* evidence, so a wild window silently deletes weeks of real training
from ST1 and T1, and he would see `Not enough sessions on Row to judge` for a month with nothing to
diagnose. Collapsing costs at most one day of evidence.

**Rider:** apply the same collapse to `deloadStatus().last`, not only to E2's window. `last` feeds
`since`, which is T2's freshness gate and T3's week count. A `last` earlier than the deload's own start
makes T2 fireable sooner and T3's count longer — both eager, both in the wrong direction for a
recommendation. One rule for both consumers: **effective end = `max(startDate, endDate)`.** And a
corrupt record must never report `active`.

**Confidence.** All three are `[Opinion]` on the engineering shape and `[Certain]` only on the
direction each must fail in: refuse loudly rather than answer off a redefined prescription; do not
claim a session was short when nothing was recorded; and when a stored date is impossible, discard one
day of evidence rather than weeks of it.

---

## 7.12 Does a deload reset T1's streak? — **yes. Confirm reset.**

**Added 2026-09-10, from QA's pass.** Genuinely unruled and correctly raised.

Both framings offered miss the point that settles it. **T1's only output is "take a deload week."**
So the question is not whether a pre-deload failure is still meaningful evidence — it is whether the
right prescription for *failing after a deload* is **another deload**. It is not. `[Certain]`
repeating an intervention that has just demonstrably failed is not coaching, and firing the same
banner nine days after he took the last one is the fastest way to teach him the banner means nothing —
which is the cost audit §8 already named and which I have now ruled on three times.

The "reset is wrong" argument is the better of the two and it is still wrong, because it assumes the
app goes quiet. It does not:

- **The session card already speaks, that day, with a number.** He is below `lo` at a load he owns, so
  P1 case 1 fires: `2 reps at 120 kg. Below the range. Drop to 115 kg next session.` That is the
  correct instruction for this state and it is more actionable than a deload banner.
- **ST1 is not gated on `since`.** The Trend tab still reports the stall throughout.
- **T2 and T3 still run**, T2 on a window that is entirely post-deload (§7.2) and therefore on genuinely
  new evidence. A second deload three weeks later, off three weeks of fresh stalling, is defensible.
  A second deload nine days later, off the weeks that caused the first, is not.

**So the whole cost of reset is that T1 surfaces one session later.** The cost of no-reset is a wrong
prescription delivered with confidence. One session against wrong advice is not a close call.

```
Rule: E1 clause (d) — a finished deload restarts the streak
Applies to:   Rule D1 trigger T1 only.
Logic:        T1's ladder reads only dates strictly after the most recent
              deload's effective end (`since` = deloadStatus().last, clamped
              per the §7.11 rider). A failure on or before that date is not a
              row and cannot pair with a failure after it.
              Distinct from E2, which removes deload dates themselves. Both
              stand: E2 is the guard that survives any future change to `since`,
              and it is the only one that acts when a window sits in
              `state.deload.past` with no current record.
Output copy:  none. Nothing new renders.
Not enough data: unchanged — T1 needs two post-deload FAIL dates.
```

**Worked example — `fail → deload → fail`.** Squat `{s:3, lo:3, hi:5}`.

- `05-04` 120×5/5/5 → COMPLETE, best 120.
- `05-11` 120×2/2/2 → FAIL, run 1.
- `05-18` 120×3/2/2 → FAIL, run 2 → **T1 fires.** He starts the deload `05-19`; it ends `05-25`.
- `06-01` 120×2/2/2 → the ladder starts after `05-25`, so this is row one → run 1 → **no trigger.**
  The card still reads `2 reps at 120 kg. Below the range. Drop to 115 kg next session.`
- `06-08` 120×2/2/2 → run 2 → **T1 fires again**, on two failures that both postdate the deload. That
  is the real finding, and it arrives one session after the no-reset reading would have claimed it.

**Confirm the pinned test** `D1 - a FINISHED deload also restarts T1's evidence`. No change.

**The gap this exposes, named and deliberately not filled in this batch.** `fail → deload → fail` is a
distinct state — *the deload did not take* — and the honest sentence for it is neither "take a deload
week" nor silence. It is closer to: stop adding, drop the working load, and if it persists this stopped
being a programming problem. **I am not writing that rule now.** It is a new user-facing claim, the
suite is green at 347, the frontend is mid-redesign, and it touches the edge of what the app may say —
repeated unexplained strength loss is not something this app assesses, and any copy for it must point
at a person rather than guess, per audit §10. Raise it as a backlog item for after there is real
history to calibrate against. `[Opinion]`, and the conservative side of it: the card's `Drop to 115 kg`
is already the correct action, so what is missing is acknowledgement, not instruction.
