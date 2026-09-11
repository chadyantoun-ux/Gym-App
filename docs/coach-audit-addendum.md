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

---

# 8. WO-004 W1 — adjudicating the redesign's programme

**Added 2026-09-10. Answers `docs/work-orders/WO-004-redesign.md` §W1 (a)–(f).**

Sources read: `docs/design/PHAT App.dc.html` L456–506 (`BASE_PLAN`) and L601–619 (`verdict`);
`index.html:226-276` (`PROGRAM`, `KEY_LIFTS`); `docs/context/handoff-brief.md` §3–§4;
`docs/coach-audit.md` §1, §5–§7, §9; this file §I1–§I2, §S2, §6, §7.

**The frame, stated rather than assumed.** `docs/context/handoff-brief.md` is the programme
(CLAUDE.md §7). `docs/design/PHAT App.dc.html` is a mock-up: its job is to show what the app looks
like, and its `BASE_PLAN` is prop data written to make screens render, not a coaching document.
Wherever the two disagree the brief wins by default, and the design has to earn an exception with a
reason. **It earns none below.** That is not a criticism of the design — nobody asked a prototype's
seed array to be a verified programme, and it should never have become the tiebreak candidate it did.

---

## 8.0 Rulings at a glance

| # | Question | Ruling |
|---|---|---|
| a | The 9 `power` → `hyp` reclassifications | **Reject all of them.** And there are **8**, not 9 — the work order's list is wrong about `d2b`. Rule **K1**. |
| a | Day heading vs exercise character | **The day heading governs.** `k` is a progression-protocol tag, not a claim about adaptation. Rule **K1**. |
| b | `d2e` "Glute-ham raise or lying leg curl" | **Two exercises. Data problem.** Resolve to one, record the choice, and change `implement`. Rule **A1**. |
| b | `d3d` "DB row or shrug" | **Two exercises. Data problem.** Not even alternates — different movement patterns. Rule **A1**. |
| b | `d1a` "Bent-over or Pendlay row" (B-28) | **One exercise, two names. Display problem** — conditional on him committing to one style. Rule **A1**. |
| c | Extra sets vs P1 | **Excluded.** `C` = the first `ex.s` **completed** sets. Confirms audit §3. Rule **X1**. |
| c | Extra sets vs H1 | **Excluded from the comparison, both sides.** They belong in the session volume total, which is a different number for a different purpose. Rule **X1**. |
| c | The `EXTRA` badge | The prototype computes it from **row index**; it must be computed from **completed-set ordinal** or the badge lies. Rule **X1**. |
| d | SP1 / V1 / D1 on a foreign plan | Named absent states, copy below. T3 survives; T1 and T2 do not. Rule **C7a**. |
| d | **May ST1's week-6 test run on a non-PHAT plan?** | **The measurement may. The brief's diagnosis may not.** Different copy, gated on provenance. Rule **C7b**. |
| e | R1 per exercise or per day | **Per exercise. Confirmed.** The design's day rest is wrong on 24 of 42 slots and is actively harmful on the three speed slots. Rule **R1** unchanged. |
| f | The Diet numbers | **Approved verbatim** — all eight match the brief exactly. |
| f | The Diet *copy* | **Corrected.** Three additions the design omits, one contradiction, one wrong-day bug. §8.6. |

**Data criterion (W1 acceptance, last bullet), answered up front.** Nothing I rule here changes any
exercise `id`, `s`, `lo`, `hi` or `cut`. I re-checked all 42 slots against the design's `BASE_PLAN`
this pass: **every `s`, `lo` and `hi` is identical**, and the design's nine `cut` flags sit on exactly
the nine `PROGRAM` slots that carry `cut:1`. The design's programme differs from the verified one in
**precisely two dimensions**: `k` on 8 slots, and 3 exercise names. That is a much smaller delta than
B-55 assumed and it is worth recording, because it means the transcription was careful and the `k`
column is the one place it went wrong.

**One change I do rule that touches data**, named as required: resolving `d2e` to "Lying leg curl"
requires `implement` to move `bodyweight` → `machine`. That is not cosmetic — `implement` drives Z2's
load word and I2's increment line, so the same logged history would render different copy before and
after. **Cost today: zero, because the log is empty.** Cost in six weeks: every historic `d2e` entry
re-renders with a different load word. Do it now or accept that it can never be done cleanly. `[Certain]`

---

## 8.1 (a) Rule K1 — the `k` reclassification

### First: the work order's list is wrong, and transcribing it would cause a change nobody asked for

WO-004 §W1 names nine slots including **`d2b` hack squat**. The design does **not** reclassify it:

```
PHAT App.dc.html:471   ex("Hack squat", 2, 6, 10, "power", "Full depth before the knees drift forward.")
```

`d2b` is `power` in `PROGRAM` and `power` in the design. There are **8** reclassifications, not 9. An
engineer working from the work order's prose rather than from the file would flip hack squat to `hyp`
— a programme change originating in a typo in a bug report. Flag raised, `[Certain]`.

### The reclassification is not a coaching position, because it is not internally consistent

If the design were arguing "6–10 rep assistance work is hypertrophy work", it would have flipped every
6–10 slot on days 1 and 2. It flips seven of ten and keeps three:

| Kept `power` at 6–10 reps | Flipped to `hyp` at 6–10 reps |
|---|---|
| `d1b` Weighted pull-up · `d1e` Weighted dip · `d2b` Hack squat | `d1c` Rack chin · `d1f` Seated DB shoulder press · `d1g` Cambered bar curl · `d1h` Skull crusher · `d2c` Leg extension · `d2e` Leg curl · `d2f` Standing calf raise · `d2g` Seated calf raise |

No rule separates those two columns. Not compound vs isolation — rack chin and seated DB press are
multi-joint and were flipped; hack squat is a machine and was kept. Not implement — flat DB press is
`db` and stayed `power`, seated DB press is `db` and did not. Not the `cut` flag — two of the flipped
are `cut`, six are not. `[Likely]` this is prop data written by eye to make a screen look plausible,
which is exactly what prop data is for. **There is no coaching argument here to rebut**, so I am
ruling on the underlying question instead, which is real and which the work order asks correctly.

### The actual question: does the day heading govern, or the exercise's own character?

**Ruling: the day heading governs, and `k` is not a claim about the exercise's character at all.**

The confusion is caused by the tag's name. `k: "power" | "hyp" | "speed"` reads like a statement about
training adaptation, and as such it would be indefensible: `[Certain]` a 3 × 6–10 skull crusher does
not train power in any mechanistic sense, and neither does a 2 × 6–10 seated calf raise. If `k` meant
what its name implies, the design would be right and I would be wrong.

It does not mean that. In this codebase `k` selects **which progression protocol runs** (P1 vs H1 vs
the speed branch) and **which rest row applies** (R1). It is a routing tag. And the brief assigns the
progression protocol **per day**, explicitly, in its own words:

> **Power days:** pick a weight you could get one more rep with, not two. Add 2.5 kg when all sets hit
> the top of the range. — `handoff-brief.md:185`

That sentence is Rule P1. It is written under *Execution rules*, it says "power days", and it is not
qualified to the 3–5 rep slots. Every exercise printed under *Day 1 — Upper power* and *Day 2 — Lower
power* is governed by it. `[Certain]` — this is a reading of the brief, not an opinion about
physiology.

I already recorded this in `coach-audit.md:62-64` when I verified the 42 slots, and I am confirming it
rather than revisiting it:

> every Day 1 and Day 2 exercise is tagged `k:"power"`, including the 6–10 rep assistance work. That
> is faithful to the brief, which states its execution rule per *day*, not per exercise.

### What flipping would actually change, which is the part that settles it

**1. It would break the brief's rest instruction.** The brief writes *Day 1 — Upper power (rest 2–3
min)* and *Day 2 — Lower power (rest 2–3 min)* — a day-level band, all exercises. R1 honours it at the
bottom of the band for the 6–10 work: `power, hi > 8` → ready 120 s, cap 180 s. Flip to `hyp` and
`hi <= 12` gives ready 90 s, cap **120 s** — *below the brief's stated minimum*, and the copy at 2:30
would read `2:30. You are past the rest window. Go.` on a power day where the brief says rest two to
three minutes. That is the app contradicting the programme in a sentence. `[Certain]`

**2. It would swap a conservative rule for a permissive one.** P1 adds load only when every set in the
prescription reaches `hi` at a matched weight. H1's case 2 adds load when every rep exceeds `hi`, and
its case 4 rewards raw tonnage. On a 2 × 6–10 seated calf raise, tonnage is trivially inflated by reps
— which is the exact defect B-25 exists to fix on the days where tonnage comparison genuinely belongs.
Moving eight more slots under a tonnage rule enlarges the surface of the bug I just closed. `[Likely]`

**3. It would make the app's advice depend on a distinction the brief does not draw.** He would get
`Top of range on all 3 sets. Go to 32.5 kg next session.` on a cambered bar curl today and
`Volume up 4% — 1,040 kg against 1,000 kg.` tomorrow, for the same behaviour. The first is an
instruction. The second is a scoreboard. Power days should give instructions.

### The table, transcribable without interpretation

```
Rule: K1 — role tags on Day 1 and Day 2
Applies to:   the `k` field on every PROGRAM slot in d1 and d2. Selects P1 vs H1 and R1's rest row.
Inputs:       handoff-brief.md §4 day headings and §4 Execution rules. No user data.
Logic:        An exercise's `k` is the progression protocol its DAY prescribes, not the adaptation
              its rep range targets. Every exercise under a Power day heading is k:"power".
              Every exercise under a hypertrophy day heading is k:"hyp", except the explicitly
              labelled speed slot, which is k:"speed".
Output copy:  none. K1 emits nothing; it decides which other rule speaks.
Not enough data: n/a — this is a fixed reading of a fixed document.
```

| id | Name | Brief's role | Design's role | **Ruling** | Why, one line |
|---|---|---|---|---|---|
| `d1c` | Rack chin | power (Day 1 heading) | hyp | **`power` — keep** | Day 1 is a power day; `cut:1` marks it reduced-volume, not reduced-intensity. |
| `d1f` | Seated DB shoulder press | power | hyp | **`power` — keep** | The brief's 2–3 min rest and add-2.5-kg-at-top-of-range apply to the whole day. |
| `d1g` | Cambered bar curl | power | hyp | **`power` — keep** | Load-progressed assistance; P1's matched-sets test is the safer rule for a barbell curl. |
| `d1h` | Skull crusher | power | hyp | **`power` — keep** | Distinct from `d5i` skull crusher (3 × 12–15, `hyp`); the *day* is what differs, and that is the point. |
| `d2b` | Hack squat | power | **power (unchanged)** | **`power` — keep** | **Not reclassified by the design.** WO-004 §W1's list is wrong; no ruling was needed. |
| `d2c` | Leg extension | power | hyp | **`power` — keep** | Machine isolation, but on a power day under the brief's day-level rule. |
| `d2e` | Glute-ham raise or lying leg curl | power | hyp | **`power` — keep** | See A1 separately for the name; the role does not move. |
| `d2f` | Standing calf raise | power | hyp | **`power` — keep** | Under H1 a calf raise's tonnage is inflatable by reps; P1 is the honest rule here. |
| `d2g` | Seated calf raise | power | hyp | **`power` — keep** | As above. |

**Nine rows, eight rulings, one correction.** `PROGRAM` is unchanged. Zero migration, zero data cost.

**Worked examples**

1. `d1g` cambered bar curl `{s:3, lo:6, hi:10}`, logged 30×10, 30×10, 30×10. Under K1 → P1 case 4 →
   `Top of range on all 3 sets. Go to 32.5 kg next session.` plus I2's increment line (`implement:"bb"`
   — **no** increment line, per §I2). Rest: `power, hi>8` → ready 120 s.
2. **Boundary.** `d1h` skull crusher `{s:3, lo:6, hi:10}` vs `d5i` skull crusher `{s:3, lo:12, hi:15}`.
   Same movement, two ids, two `k` values, two rest rows (120 s vs 60 s). Both correct. This is the case
   that proves `k` is per-slot-in-a-day and not per-movement, and it is the case the prototype's
   name-derived key scheme collapses (C-6).
3. **Failing case, under the design's tags.** `d2f` standing calf raise as `hyp`, logged 100×10/10/10,
   last session 100×10/10/10. H1 case 4 → tonnage 3,000 vs 3,000 → the matched branch. He did the
   prescription perfectly at the top of the range and the app does not tell him to add weight. Under K1
   → P1 case 4 → `Top of range on all 3 sets. Go to 102.5 kg next session.` The design's tag costs him
   a progression step for doing exactly what the programme asked. `[Certain]`

**Rationale.** The brief states its progression and rest rules per day, and the app's `k` field is
where a day-level rule is stored per exercise. Flipping the tag changes both the instruction he gets
and how long he rests, and the rest change puts the app below the brief's own stated minimum on a
power day. The design's split is not internally consistent, so there is no competing coaching position
to weigh against the brief.

**Documentation recommendation, no code and no data change.** Add one line wherever the exercise shape
is documented: *`k` is the progression protocol the exercise's day prescribes, not the adaptation its
rep range targets.* This ambiguity has now produced one escalation (B-55) and one wrong list in a work
order. It will produce more. `[Opinion]`

---

## 8.2 (b) Rule A1 — the three dropped alternates

The brief writes three slots with an "or" in the name. The design silently resolves all three. **The
resolutions are probably the right ones; the silence is the defect.** Two of them are two exercises
wearing one id, and that is a data problem the plan editor makes worse rather than better.

```
Rule: A1 — a slot with a declared alternate
Applies to:   PROGRAM slots whose brief name contains "or": d1a, d2e, d3d. Plan setup and the
              plan document. No screen renders a slash-name.
Inputs:       one choice per slot, made once, stored in the plan document. No user history needed.
Logic:        Classify each slot first:
              (A) TWO EXERCISES  — the alternates differ in movement pattern OR in implement OR in
                  typical working load by more than ~25%. -> two ids, one active, the choice is
                  recorded and changeable only as a plan edit.
              (B) ONE EXERCISE   — the alternates are the same pattern on the same implement at a
                  comparable load; the difference is style or regional name. -> one id, one displayed
                  name, chosen once. Alternating styles is a plan edit, not a set-to-set option.
              The app never displays "X or Y" as an exercise name, because a name is also a label on
              a history and a history cannot be about two things.
Output copy:  the chosen name, plain. Plus the setup prompt below.
Not enough data: the choice is an input, not an inference. The app must ASK. It must not default
              silently, and it must not pick the first name in the string.
```

| id | Brief's name | Design's name | Class | **Ruling** |
|---|---|---|---|---|
| `d2e` | Glute-ham raise or lying leg curl | Lying leg curl | **(A) two exercises** | Two ids. Ask once. **`implement` changes with the answer** — this is the one data-touching change in this document. |
| `d3d` | DB row or shrug | DB row | **(A) two exercises** | Two ids. Ask once. Not alternates in any real sense — see below. |
| `d1a` | Bent-over or Pendlay row | Bent-over row | **(B) one exercise** | One id. Display one name. Conditional on him committing to a style — stated in the setup copy. |

### `d2e` — glute-ham raise vs lying leg curl. Two exercises. `[Certain]`

Different implement (bodyweight/loaded vs plate stack), different load scale (a GHR is often
unloadable and unprogressible in 2.5 kg steps; a leg curl is a 5 kg-per-plate machine), and different
joint action (GHR is knee flexion *plus* hip extension against a lengthened hamstring; the lying curl
is knee flexion only). They train the same muscle. They are not the same exercise, and logging both
under `d2e` produces a history in which 0 kg × 8 and 45 kg × 8 sit in one column. Everything
downstream reads that column: `lastFor`'s ghost text, P1's `workingLoad`, Z1/Z2's load word, the
trend.

`PROGRAM` currently has `implement:"bodyweight"` on `d2e` — the GHR reading. If the answer is lying
leg curl, `implement` must become `machine`. That flips Z2's zero-load word from `bodyweight` to
`zero load` and turns I2's increment line on. Same logged numbers, different sentences. **Free today,
not free later.**

`[Opinion]`, and he should be told it is an opinion: **default the prompt to lying leg curl.** It is
progressible in small steps, it does not require equipment most commercial gyms lack, and a lifter
whose stated problem is *"training but not with intensity"* is better served by a movement where the
next session's target is unambiguous. The GHR is the better exercise for someone who can already do
sets of ten with control. **This needs his real training history, which does not exist yet** — one
logged Day 2 answers it and no amount of reasoning does.

### `d3d` — DB row vs shrug. Two exercises, and they are not alternates. `[Certain]`

A dumbbell row is horizontal pulling — lats, mid-back, rear delt. A shrug is scapular elevation —
upper trap, and nothing else. They are not substitutes for each other; PHAT lists them in one
accessory slot because either fills the same *slot*, not because either fills the same *role*. Working
loads differ by roughly 2–3× for the same rep range, so a shared history makes the ghost text and H1's
tonnage comparison actively misleading rather than merely imprecise. Two ids.

Extra consequence, worth stating because it is easy to miss: `d3d` carries `cut:1` and appears in V1's
`REINTRO_ORDER` for `d3` **by id**. Whichever is chosen inherits that position. If both ids exist in
the plan, only the active one is in `REINTRO_ORDER`, or week 5's ramp offers him an exercise he does
not do.

### `d1a` — bent-over vs Pendlay row (B-28). One exercise. Display. `[Likely]`

Same pattern, same implement, same slot, same 3 × 3–5, and it is an ST1 key lift. The honest caveat:
they are not identical — a Pendlay row is a dead-stop from the floor and typically runs 5–15% lighter
than a touch-and-go bent-over row for the same reps. That difference is small enough for P1 to absorb
**only if he does not alternate between them**. If he alternates week to week, P1 prints
`Sets not matched` at style changes and ST1's e1RM blocks swing by more than the 2.5% progress
threshold — a false stall on the app's most important lift.

So: **one id, one displayed name, one choice, and the choice is a plan edit.** My §D-1 asked for
`Bent-over / Pendlay row` as the display name; **I am superseding that.** A slash-name on screen
invites exactly the alternating that breaks the rule. Pick one, show one.

`[Opinion]` default the prompt to **bent-over row** — it matches `PROGRAM` today, it matches the
design, and it is the more common of the two in a commercial gym.

### Output copy

Setup prompt, shown once per slot when a plan carrying an alternate is first started:

- `d2e`: `Which do you do? Glute-ham raise / Lying leg curl` with the note
  `Pick one and stay with it. They load differently, so one history cannot describe both.`
- `d3d`: `Which do you do? DB row / Shrug` with the same note.
- `d1a`: `Which row? Bent-over / Pendlay` with the note
  `Pick one and stay with it. A Pendlay row is lighter for the same reps, and this lift is one of the four the six-week check reads.`
- Changing it later, in the plan editor: `Changing this changes what the history means. The old sets stay under the old name.`

**Worked examples**

1. He picks lying leg curl. `d2e` gets `n:"Lying leg curl"`, `implement:"machine"`, `k:"power"` (K1),
   `s:2, lo:6, hi:10` unchanged. Logs 45×10/10 → P1 case 4 → `Top of range on all 2 sets. Go to 47.5 kg
   next session.` plus I2's line, because `machine` gets one: `If 2.5 kg is not available, add reps up
   to 12 first, then jump.`
2. **Boundary.** He picks glute-ham raise. `implement:"bodyweight"` stands, logs 0×8/0×8 → Z1 says
   completed, Z2 says `Stay at bodyweight until all 2 sets reach 10 reps.` No `0 kg` string anywhere.
   Both answers are correct programmes; only one can be a history.
3. **Failing case, under the design's silent resolution.** The design renames `d2e` to "Lying leg curl"
   and leaves `implement:"bodyweight"`. He logs 45 kg × 10. The app has a machine load under a
   bodyweight tag: I2's increment line is suppressed (bodyweight does get one — see §I2 — but for the
   wrong reason and with the wrong text), and Z2's word for a zero entry would be `bodyweight` on a
   plate-stack machine. Two wrong sentences from one unasked question.

---

## 8.3 (c) Rule X1 — extra sets, ruled separately for P1 and H1

The design (L430, L780-782) lets him append sets past the prescription, badges them `EXTRA`, counts
them in volume, and leaves the prescription unchanged. **That behaviour is right and I approve it.** A
lifter who has an extra set in him should log it, not hide it. The question is what the *verdict* does
with it, and the answer must be the same in both rules: **nothing.**

```
Rule: X1 — extra sets and the verdict
Applies to:   every role. Session screen verdict and the session summary.
Inputs:       ex {s}; this session's sets in row order; Z1's completed test.
Logic:        C = the first `ex.s` COMPLETED sets, in row order.
              1. P1 reads C and only C: `equal`, `load`, and "all sets at the top of the range"
                 are all computed over C. Sets beyond C cannot create, remove or change a verdict.
              2. H1 reads C and only C, on BOTH sides of the comparison: this session's C against
                 the previous entry's C. Range compliance (cases 1-2) and tonnage (case 4) alike.
              3. The SESSION VOLUME TOTAL counts every completed set, extras included. Two numbers,
                 two purposes: the verdict is about the prescription, the total is about the work.
              4. The EXTRA badge on row i is true when the number of completed sets in rows 1..i-1
                 is >= ex.s. It is NOT `i >= ex.s`. The badge means "this row cannot affect the
                 verdict", so it must be computed the same way C is.
Output copy:  extras present, k:"hyp":   `<n> set<s> past the prescription. Counted in today's volume, not in the verdict.`
              extras present, k:"power": `<n> set<s> past the prescription. The verdict reads the first <ex.s>.`
              extras present, k:"speed": `<n> set<s> past the prescription. Speed work is <ex.s> sets. Extra sets are extra fatigue.`
              no extras:                 nothing on power and speed; on hyp, nothing.
Not enough data: unchanged. Fewer than `ex.s` completed sets -> no verdict at all (C-11), regardless
              of how many rows exist.
```

**Two corrections to the prototype, both small and both load-bearing.**

*(i) The badge is computed from the row index.* `PHAT App.dc.html:762` — `flag: i >= e.s ? "EXTRA" : ""`.
Leave row 2 blank on a 3-set exercise and fill rows 1, 3 and 4: C is rows {1, 3, 4}, so row 4 **is**
part of the verdict, and the screen badges it `EXTRA`. The badge tells him the set does not count when
it does. Compute it from completed-set ordinal. `[Certain]`

*(ii) The idle invitation.* The design prints `Add sets freely. Extras are logged and counted in
volume; the prescription stays as written.` on every exercise, including a 3 × 3–5 squat. `[Opinion]`
— on a power slot the app should not suggest extra sets. The prescription is three hard matched sets
at a weight he could get one more rep with; a fourth is fatigue that lands on tomorrow's lower power
day. **Render the idle invitation on `k:"hyp"` only.** On power and speed the note is absent until an
extra actually exists, and then it is factual, not encouraging.

### P1 — worked examples on a 3 × 3–5 slot

Squat `{id:"d2a", s:3, lo:3, hi:5, k:"power"}`.

1. **(i) Fourth set at the same load, top of range.** `100×5, 100×5, 100×5, 100×5 [EXTRA]`.
   C = the first 3 → weights {100,100,100}, `equal` true, every `r >= 5` → **P1 case 4**.
   → `Top of range on all 3 sets. Go to 102.5 kg next session.`
   Session volume total: 2,000 kg (all four sets). Verdict tonnage: not used by P1 at all.
   **The fourth set does not make the verdict "more" true and does not change the recommended load.**
   The prescription was satisfied at set 3; sets after that are work, not evidence about the
   prescription.
2. **(ii) Fourth set as a back-off.** `100×5, 100×5, 100×5, 80×8 [EXTRA]`.
   C = the first 3 → identical to case 1 → `Top of range on all 3 sets. Go to 102.5 kg next session.`
   Session volume total: 2,140 kg. `workingLoad` is 100, **not** 80.
3. **The failing case — what happens if extras are included.** Same log as (ii). C would be
   {100,100,100,80} → `equal` is false → **P1 case 2** →
   `Sets not matched: 100 / 100 / 100 / 80 kg. Repeat 100 kg until all 3 sets reach 5 reps.`
   He completed the prescription perfectly and then did an extra back-off set, and the app took his
   progression away for it. `[Certain]` this is the same class of error as B-08, arriving from the
   other direction — B-08 used `max` and over-prescribed; including extras uses too wide a set and
   under-prescribes. Both are fixed by the same sentence: **`C` is the first `ex.s` completed sets.**
4. **Boundary.** `100×5, (blank), 100×5, 100×5`. Three completed sets, four rows. C = rows {1,3,4}.
   Verdict fires (three completed >= `ex.s`), row 4 carries **no** badge, and `100×5` on row 4 is part
   of the working load. Under the prototype's index rule, row 4 is badged `EXTRA` while driving the
   verdict.

This **confirms `coach-audit.md` §3** — *"C = the first `ex.s` completed sets. Extra sets beyond
`ex.s` are ignored."* — which already said this. Nothing in P1 changes. `[Certain]`

### H1 — worked examples on a 3 × 3–5 slot

A 3 × 3–5 slot with `k:"hyp"` does not exist in PHAT, by K1. It can only arise on a **user-created
plan** (the plan editor lets him set any `s/lo/hi` with any `k`), so the examples below are written on
a user exercise `{s:3, lo:3, hi:5, k:"hyp", implement:"machine"}` — which is the case the work order
is really asking about.

**Ruling: H1 compares `C` against the previous entry's `C`. Extras are excluded from both sides.**
`[Certain]`

Previous session: `100×5, 100×5, 100×4` → C tonnage **1,400 kg**.

1. **(i) Fourth set at the same load, top of range.** `100×5, 100×5, 100×5, 100×5 [EXTRA]`.
   C = first 3 → 1,500 kg. Case 1 no (5 >= lo 3), case 2 no (5 is not `> hi` 5), case 3 no →
   **case 4**: 1,500 vs 1,400 → `Volume up 7% — 1,500 kg against 1,400 kg.`
   Session volume total: 2,000 kg.
   **If extras were counted: 2,000 vs 1,400 → `Volume up 43%`.** That number describes a set count
   change, not a training improvement, and next week when he does three sets again it becomes
   `Volume down 25%` — the app manufacturing a regression out of a good session. `[Certain]`
2. **(ii) Fourth set as a back-off.** `100×5, 100×5, 100×5, 80×8 [EXTRA]`.
   C = first 3 → 1,500 kg → `Volume up 7% — 1,500 kg against 1,400 kg.` Identical to (i), correctly:
   the verdict is about the prescription, and the prescription was the same in both.
   Session volume total: 2,140 kg.
   **If extras were counted: 2,140 vs 1,400 → `Volume up 53%`.**
3. **The failing case in the other direction — extras can SUPPRESS a correct increase.**
   `100×6, 100×6, 100×6, 80×4 [EXTRA]` on the same `hi:5` exercise.
   C = first 3 → every `r > hi` → **H1 case 2** → too light → add weight, per G1's step.
   If extras were included, `every r > 5` is false (the back-off set's 4 is not > 5), case 2 does not
   fire, and it falls through to a tonnage comparison. He exceeded the range on every prescribed set
   and the app declines to tell him the weight is too light, because he did a back-off set.
   **Exclusion matters in both directions**, which is why the rule is stated once and applied to every
   H1 case rather than only to the tonnage branch.
4. **Boundary — an unequal comparison.** Previous entry has 4 completed sets (three prescribed + one
   extra), this session has 3. Both sides truncate to C = 3 → 1,500 vs 1,400. Without truncation on
   the *previous* side, doing an extra set once permanently raises the bar he is measured against and
   he can only ever go "down" afterwards. This is why the rule says **both sides**.

**Rationale.** The verdict answers one question — *did you complete what was prescribed, and what
should the load be next time* — and a set that was not prescribed cannot help answer it. The design's
own sentence, *"volume counts it, the prescription doesn't change"*, is correct but ambiguous between
the session volume total and the verdict's internal tonnage; the correction makes it two explicit
numbers. `[Convention]` truncating both sides of a like-for-like comparison to the prescribed set
count is standard practice in every logger that compares sessions at all, for the reason in example 4.

---

## 8.4 (d) Rules C7a and C7b — silence copy on a user-created plan

The plan editor means the app can no longer assume it is running PHAT. Four features are keyed to
programme data a user plan does not have. **Every one of them must be able to say "this plan does not
tell me that" and stop.** A guess here is worse than in any other part of the app, because the user
built the plan and will read a confident sentence as the app having understood it.

```
Rule: C7a — named absent states for plan-specific features
Applies to:   SP1 (speed load), V1 (volume tier), ST1 (stall), D1 (deload). Every screen.
Inputs:       the plan document's declarations: `speedSource` (map exId -> exId),
              any exercise carrying `cut`, `keyLifts` (list of exIds, max 4).
              No user history is required to reach an absent state — absence is a property of the
              PLAN, and must be detectable on day zero with an empty log.
Logic:        A feature has three states, not two:
              ABSENT       — the plan declares nothing. Show the named absent line ONCE, in the
                             place the feature would have appeared. Never on the session card.
              PRESENT-THIN — the plan declares it, the log is too thin. Existing not-enough-data
                             copy from coach-audit.md §4-§8, unchanged.
              PRESENT      — run the rule.
              ABSENT is checked FIRST. A plan that declares nothing never reaches a
              "not enough data yet" message, because more data will never help.
Not enough data: distinct from ABSENT and must not share copy. "Log more" is a lie when the
              feature is switched off by the plan.
```

The distinction in that last line is the whole ruling. `Not enough sessions on SLDL to judge. Log it
weekly.` tells him to do something that will work. Showing that same line on a plan with no key lifts
tells him to do something that will never work, and he will log for six weeks waiting for a message
that cannot arrive. `[Certain]`

### SP1 — a `k:"speed"` exercise with no mapped power lift

```
Output copy (ABSENT):
  No source lift set for this speed work. Set one in the plan to get a number.
  Until then: 65–70% of a weight you could triple.
```

Second line is character-identical to SP1's existing thin-data fallback (`coach-audit.md` §7), on
purpose: the *advice* is the same, only the reason differs. The too-heavy live check (`> R × 0.75`)
cannot run without `R` and is silent. `[Certain]`

### V1 — a plan where no exercise carries `cut`

There is no reduced-volume tier, so there is no weeks-1–4 block, no reintroduction offer, no rollback,
and no "N of 9 accessories" clause anywhere. All exercises render from week 1.

```
Output copy (ABSENT), in the plan screen only, never on Train or Session:
  This plan has no reduced-volume tier. Every exercise runs from week 1.
  Mark accessories as cut in the plan to phase them in.

Cycle line (C-10 / PHAT.cycleLine) on such a plan: the volume-phase clause is OMITTED.
  Week 7 · 31 sessions
NOT: `Week 7 · full volume phase · 0 of 0 accessories back`
```

`0 of 0 accessories back` is the shape of sentence that makes an app look broken, and the phase name
`full volume` is a claim about a programme structure this plan does not have. `[Certain]`

### D1 — a plan with no key lifts

D1's triggers split cleanly by what they read:

| Trigger | Reads | On a plan with no key lifts |
|---|---|---|
| T1 performance drop | key lifts, per-lift history | **Silent.** No lift is nominated, so "went backwards" has no subject. |
| T2 broad stall | ST1 output on key lifts | **Silent.** ST1 itself is absent (below). |
| T3 calendar backstop | dates only, via `trainingWeeks` | **Runs.** `[Opinion]`, reasoned below. |

`[Opinion]` **T3 survives and T1/T2 do not**, because T3 needs nothing the plan must declare — nine
consecutive training weeks with no lighter week is a fact about the calendar, and "take a lighter week
after two months of unbroken training" is defensible advice to any lifter on any plan. T1 and T2 are
diagnoses about specific lifts, and on a plan the app did not verify it has no lifts to diagnose. The
risk in my position is a deload recommended to someone who does not need one, which costs a week of
reduced stimulus and nothing else; the alternative risk is never mentioning fatigue to someone
training nine weeks straight. I take the first.

The deload *content* must be restated in role terms, dropping PHAT's structure:

```
Output copy (ABSENT — T1/T2 off), on the plan screen only:
  This plan names no key lifts, so the app cannot spot a stall or recommend a deload from your
  numbers. It will still flag nine straight weeks without a lighter one.

Output copy (T3 fires on a foreign plan):
  Nine weeks straight with no lighter week. Take one: same weights, two sets per exercise, stop two
  reps short of the top of the range.
  Buttons: Start deload week / Not now

Output copy (T3 fires on PHAT): unchanged from coach-audit.md §8, including the cut-accessory clause.
```

The foreign-plan version deliberately drops *"Power days: … Hypertrophy days: … all cut accessories
out"*, because a plan with no `cut` tier has no accessories to pull and may have no day the app can
call a power day. Reducing sets and backing off proximity to failure translates to any plan; PHAT's
day structure does not. `[Likely]`

### ST1 — the headline question, ruled separately as C7b

**May the week-6 test run on a non-PHAT plan at all?**

```
Rule: C7b — provenance gating on ST1
Applies to:   ST1's OUTPUT COPY only. The measurement is unchanged.
Inputs:       plan.planId; plan.derivedFrom; plan.keyLifts; and for the strict test, the
              s/lo/hi of the four key-lift exercises.
Logic:        1. plan.keyLifts is empty or absent            -> ST1 ABSENT. Nothing renders.
              2. plan.keyLifts is declared -> the MEASUREMENT runs unchanged: Epley e1RM,
                 r <= 8, two 21-day blocks, trainingWeeks >= 6, >= 2 sessions per lift per block,
                 1.025 threshold. That arithmetic is plan-agnostic.
              3. The DIAGNOSIS copy is gated on provenance:
                 PHAT-provenance = plan.planId === "phat"
                                   OR (plan.derivedFrom === "phat"
                                       AND all four key-lift exercises still present
                                       AND their s, lo and hi are unchanged from the shipped plan)
                 PHAT-provenance TRUE  -> the brief's copy, unchanged.
                 PHAT-provenance FALSE -> the generic copy below.
```

**The split is between a measurement and a claim, and only one of them travels.** `[Certain]`

The measurement — has the estimated 1RM on these four lifts risen over six weeks — is arithmetic. It
is true or false on any plan and the app may state it.

The diagnosis is not. The brief's sentence is:

> If no: `[Certain]` the split is not the problem and neither is the diet. Either the sets are not
> close enough to failure, or he is not eating enough. — `handoff-brief.md:191-192`

That `[Certain]` was earned by a coach who had assessed **that split** and **that diet**. On a plan the
user wrote and nobody reviewed, *"the split isn't the problem"* is a claim the app cannot support —
and it is the single most likely thing to actually be wrong on a self-built plan. The app would be
using the brief's authority to vouch for a programme the brief never saw. **That specific sentence is
PHAT-only and does not travel.** `[Certain]`

```
Output copy, PHAT-provenance TRUE (unchanged from coach-audit.md §4):
  Week 7 and no progress on Row, Squat.
  This is the check we agreed on. The split isn't the problem and neither is the diet.
  Either the sets aren't close enough to failure, or you aren't eating enough.
  Fix one, not both, and give it three weeks.

Output copy, PHAT-provenance FALSE (new):
  Week 7 and no progress on Squat, Row.
  Six weeks of data and the numbers have not moved. Change one thing — how hard the sets are, how
  much you are eating, or the plan — and give it three weeks.

Output copy, ABSENT (no key lifts declared):
  This plan names no key lifts, so the six-week check cannot run.
  Name up to four in the plan to switch it on.

Output copy, PRESENT-THIN: unchanged from coach-audit.md §4.
  Not enough sessions on SLDL to judge. Log it weekly.
  Six weeks in but the log is too thin to test. Log all four lifts weekly.

Output copy, all tested lifts progressing: nothing. Unchanged.
```

The generic version keeps the brief's structure — one finding, three candidate causes, change one,
three weeks — and adds the third option the PHAT version correctly excludes. It is shorter and it
claims less. `[Certain]` that is the right trade.

**Why the provenance test is `derivedFrom` plus four unchanged lifts, and not just `planId === "phat"`.**
He will train a *copy* — the design's own plans list shows `PHAT — my version` as the active plan and
`PHAT — original` as a read-only template. A strict `planId === "phat"` test means he never sees the
copy he agreed to, which is a real loss for no safety gain if he changed only a cue or an exercise
name. The three-part test is cheap, testable, and fails closed: any edit to a key lift's prescription
drops the app to the generic sentence. `[Opinion]`, and the failure mode is one sentence of lost
specificity, never a wrong claim.

**Worked examples**

1. `planId:"phat"`, week 7, Row and Squat below 1.025 → brief's copy, unchanged. Identical to today.
2. `derivedFrom:"phat"`, he renamed `d1a` to "Pendlay row" and changed a cue. Four key lifts present,
   `s/lo/hi` unchanged → **PHAT-provenance TRUE** → brief's copy, naming "Pendlay row".
3. **Boundary.** `derivedFrom:"phat"`, he changed squat from `3 × 3–5` to `5 × 5`. → provenance FALSE
   → generic copy. Correct: a 5 × 5 squat is not the programme the brief's `[Certain]` was about.
4. **Failing case.** `+ Build from empty`, three days, no key lifts named, week 9, plenty of history.
   → **ABSENT.** `This plan names no key lifts, so the six-week check cannot run. Name up to four in
   the plan to switch it on.` The app does not print `Not enough sessions to judge` — he has plenty of
   sessions, and telling him to log more would be false.
5. A four-day upper/lower plan with `keyLifts: [bench, squat, row, deadlift]` declared, week 8, bench
   stalled → measurement runs → generic copy. The app reports the fact and does not vouch for the
   split.

**Rationale.** The measurement is arithmetic and travels; the diagnosis is a coach's judgement about a
specific programme and does not. Separating them lets the app keep its most valuable feature on any
plan without ever claiming knowledge it does not have — and the ABSENT state exists so that "this is
switched off" never masquerades as "keep logging and it will start working".

---

## 8.5 (e) Rule R1 — confirmed per exercise, and the user-created case

**Confirmed. R1 is computed from the exercise (`k` and `hi`), never from the day.** No change to the
table in `coach-audit.md` §6. `[Certain]`

The design sets rest on the day: `d1: 150`, `d2: 180`, `d4/d5/d6: 90` (L460, L469, L477, L486, L496).
Measured against R1, that is wrong on **24 of the 42 slots**, and the errors are not uniform:

| Day | Design | R1 | Slots wrong | Consequence |
|---|---|---|---|---|
| d1 | 150 s | 150 s on `d1a`,`d1d` (`hi<=8`); **120 s** on the other six | 6 | +30 s per set on the 6–10 work. Survivable. |
| d2 | 180 s | 150 s on `d2a`,`d2d`; **120 s** on the other five | 7 | 180 s is R1's **cap**, not its ready. Every set of every exercise waits to the cap. Two calf exercises alone add ~5 min. |
| d3 | 90 s | **60 s hard cap 90 s** on `d3a` speed; 90 s on the 8–12 work; **60 s** on the 12–15 and 12–20 work | 4 | **The speed slot is the serious one.** |
| d4 | 90 s | as above across speed / 8–12 / 12–15 / 15–20 | 4 | as above |
| d5 | 90 s | as above | 3 | as above |

**The speed slots are the ruling.** R1 gives `k:"speed"` a ready at **60 s** and a **hard cap at 90
s**, with the copy `1:38. Too long for speed work. Go now or drop the weight.` The design's day rest
of 90 s would start the timer and call him *ready* at exactly the number past which R1 tells him he
has ruined the set. On the one exercise in the programme where the short rest **is** the stimulus, a
day-level number does the opposite of the prescription. `[Certain]` — 6 × 3 at 67.5 kg on three
minutes' rest is not speed work, it is six easy triples, and this is the second time I have had to
write that sentence.

```
Rule: R1 (restated, unchanged) — the input is the exercise
Applies to:   every exercise, every plan, including user-created ones.
Inputs:       ex.k and ex.hi. NOTHING ELSE. No day field, no plan field, no user history.
Logic:        power, hi <= 8   -> ready 150 s, cap 180 s
              power, hi >  8   -> ready 120 s, cap 180 s
              hyp,   hi <= 12  -> ready  90 s, cap 120 s
              hyp,   hi >  12  -> ready  60 s, cap 120 s
              speed            -> ready  60 s, HARD cap 90 s
Data ruling:  `rest` is NOT a field on the day. If the design's day summary wants a number, it is
              DERIVED for display (e.g. the modal ready time across that day's exercises) and is
              never the timer's input. A stored per-day rest value is a second source of truth for
              a rule that already has one.
```

### The user-created exercise

**R1 needs nothing a user plan lacks.** C-7 makes `k` required at creation and the editor already
collects `lo`/`hi`, so R1 has both inputs on day one and runs unchanged. It is in the **plan-agnostic**
class, correctly. `[Certain]`

Three edge cases, ruled:

1. **`hi` missing or non-numeric.** Fall to the **conservative** row within the given `k`, and
   conservative differs by role: power → 150 s, hyp → 90 s (the longer rest, because under-resting
   heavy or moderate work is the harmful direction), speed → 60 s with the 90 s hard cap (the
   *shorter*, because for speed work the harmful direction is resting too long). State it explicitly
   in the engine; it is the one place where "conservative" flips sign.
2. **He picks `k:"speed"` with a rep range above 5.** R1 would hand a 3 × 15–20 lateral raise a 60 s
   ready and a 90 s hard cap, and the too-long copy would tell him he has ruined a set he cannot ruin.
   **Warn once at creation; do not block.** It is his plan, there is no injury risk, and a hard refusal
   in a plan editor is the kind of paternalism that gets an app abandoned. Copy:
   `Speed work is 3–5 reps moved fast. At 15–20 reps this is hypertrophy work. Change the reps or the role.`
   Self-limiting downstream: SP1 needs a declared source lift and will be ABSENT anyway.
3. **He picks `k:"power"` with a 15–20 range.** No warning. `power, hi > 8` → 120 s, and P1's
   matched-sets progression on a 15–20 set is unusual but not wrong. Not worth a sentence. `[Opinion]`

**Worked examples**

1. `d1g` cambered bar curl, `power`, `hi:10` → **ready 120 s, cap 180 s**. The design's day value: 150 s.
2. **Boundary.** `d3a` row speed work, `speed`, `hi:3` → **ready 60 s, HARD cap 90 s**. The design's
   day value: 90 s — i.e. the cap, presented as the target. At 1:38 R1 says
   `1:38. Too long for speed work. Go now or drop the weight.`; the design would still have been
   counting up to *ready*.
3. **Failing case.** `d2g` seated calf raise under the design's `d2: 180`. Two sets, 180 s each,
   against R1's 120 s. Add `d2f` at three sets and the design adds three minutes of standing still to
   the end of every lower power day, on calf raises. Not dangerous — just the app quietly making the
   session longer than the programme asks, on the exercises that least need it.
4. User-created "Cable crunch" `{s:3, lo:12, hi:15, k:"hyp"}` → `hyp, hi > 12` → **ready 60 s, cap
   120 s**. No plan data consulted. R1 works on plans that do not exist yet.

---

## 8.6 (f) The Diet tab

### The numbers: approved verbatim, all eight

| | Design | Brief | |
|---|---|---|---|
| Training kcal | `3,200` | ~3,200 | ✓ |
| Training protein | `170 g` | 170 g | ✓ |
| Training carb | `300 g` | 300 g | ✓ |
| Training fat | `145 g` | 145 g | ✓ |
| Rest kcal | `2,500` | ~2,500 | ✓ |
| Rest protein | `175 g` | 175 g | ✓ |
| Rest carb | `60 g` | 60 g | ✓ |
| Rest fat | `175 g` | 175 g | ✓ |

`(5 × 3,200 + 2 × 2,500) / 7 = 3,000` — consistent with the brief's stated weekly average and its
+300 surplus over an estimated 2,700 maintenance. The arithmetic is sound. `[Certain]`

### Should the app state numbers the brief tags `[Guessing]`?

**Yes, with the caveat attached to them.** `[Certain]`, and this is not the same question as B-06.

B-06 was about the app **computing** a confident number from data that could not support it — a
7-entry "weekly average" spanning a month. There the right answer was silence, because the number was
manufactured. These eight numbers are not manufactured: they are the targets he was given, they are
already his plan, and B-29 is open precisely because the app currently says *"add 200 kcal to your
training days"* without ever showing what the training-day target is — advice about a number it
refuses to display. **Withholding a target he already has is not caution, it is uselessness.**

The condition is that the estimate stays visible with the numbers. The design does this
(`These are estimates — the bodyweight trend overrides them`) and it must not be lost in
implementation: **the caveat renders on the same screen as the macro grid, without scrolling, at
400 px.** If the tab grows past one screen, the caveat moves directly under the grid.

### Approved verbatim, no change

- Header kickers `Diet` / `Targets only`. `Targets only` is a good, honest signal that the app does not
  track intake. Keep.
- The protein control: `PROTEIN HIT TODAY` / `PROTEIN NOT YET HIT`, with
  `The one non-negotiable. Rest days included.` Faithful to `handoff-brief.md:87`. Keep.
- Carb placement, training day:
  `80–100 g in the meal two hours before lifting, 80–100 g in the meal after, the rest spread across the day. Rice, potatoes, oats, fruit.`
  Faithful to `handoff-brief.md:73-74`. Keep.
- The heading `Carb placement` / `Rest-day watch item`. Keep.

**One coach ruling on the protein tick, so nobody wires it up later:** it is a habit tick. It may be
stored per date. **No rule may ever read it.** It is self-reported, unverifiable, and one tap; if it
ever fed W1's calorie decision the app would be adjusting his food off a checkbox. State this in the
data model. `[Certain]`

### Corrected verbatim

**1. The calibration block contradicts Rule W1.** This is the one real defect on the tab.

```
Design, PHAT App.dc.html:314:
  Run these for 14 days. +0.2–0.3 kg a week is correct. Flat means add 200 kcal to training days;
  over +0.5 kg means cut 200. These are estimates — the bodyweight trend overrides them.
```

It restates the brief's protocol correctly but states a **decision procedure the app does not run**.
W1's add trigger is `rate < +0.10`, not "flat"; W1 requires ≥ 5 dated weigh-ins in each of two 7-day
windows before it will say anything; W1 has a 7-day cooldown after a change. So the Diet tab describes
one procedure and the Weight tab executes another. **Two screens, two rules, is the shape of B-06** —
and B-51 shows it can reappear through a redesign. The Diet tab must stop owning the decision and
point at the screen that does.

```
CORRECTED, verbatim:

  Calibration
  These targets are estimates from your height, weight and training load, not measurements. The
  bodyweight trend overrides them.
  Weigh daily, same conditions. The Weight tab compares your last 7 days against the 7 before and
  tells you when to change something. It needs at least 5 weigh-ins in each of those weeks before it
  will say anything.
```

**2. Creatine is missing.** `handoff-brief.md:89` lists it under *Non-negotiables* with a `[Certain]`
tag, and B-29 explicitly names it. The design drops it. Add, as its own block:

```
NEW, verbatim:

  Non-negotiables
  Protein every day, rest days included.
  Creatine monohydrate 5 g daily.
  If the bar numbers do not move month over month, the surplus is being wasted.
```

The third line is `handoff-brief.md:88` and it is the sentence that ties this tab to the rest of the
app. It belongs here.

**3. The medical caveat is missing, and this one is not optional.** The tab displays **175 g of fat**
as a daily target. The brief carries a caveat and the design does not reproduce it:

> Not a dietitian. Sustained high-fat intake is worth running past a doctor if there is any
> cardiovascular or metabolic history. — `handoff-brief.md:102-103`

Per `coach-audit.md` §10 and my standing position: this app does not assess and does not work around
medical territory, and it points at a person rather than guessing. A screen that prescribes 175 g of
fat with no such line is the app taking a position it is not qualified to take. **Add it.**

```
NEW, verbatim, below the macro grid on the REST DAY segment and in the calibration block on both:

  Not a dietitian. Rest-day fat is 175 g by design. If you have any cardiovascular or metabolic
  history, run this past a doctor before you run it for months.
```

**4. `fortnight` → `two weeks`.** One-word change, for consistency with every other duration in the
app (`14 days`, `two weeks`, `7 days`).

```
CORRECTED, verbatim:
  60 g, not zero — vegetables, berries, a little dairy. Fat at 175 g is easy to overshoot because
  it's calorically dense; weigh it for the first two weeks.
```

**5. The day is hardcoded — a 700 kcal error labelled "Today".** `PHAT App.dc.html:564` defaults
`dietDay: "train"` unconditionally, and L729 hardcodes the home-screen strip:

```js
v.macroLabel = "Today — high-carb training day";
v.mKcal = "3,200"; v.mP = "170g"; v.mC = "300g"; v.mF = "145g";
```

On a Wednesday or a Sunday — the brief's two rest days — the app tells him **3,200 kcal and 300 g of
carbs is today's target** when the programme says 2,500 and 60. That is a 700 kcal and 240 g error,
delivered under the word "Today", on the two days of the week the low-carb floor exists to protect.
`[Certain]` this is the worst single line on the Diet tab and it is not a visual issue.

```
CORRECTED:
  The segment and the home strip default from the LOCAL weekday against the plan's rest days.
  On PHAT: Wed and Sun -> rest. All others -> training.
  He may still switch the segment manually; that changes the display, never the default.

  Labels, verbatim:
    training day, PHAT or any plan declaring rest days:  Today — high-carb training day
    rest day,     same:                                  Today — low-carb rest day
    a plan that declares no rest days:                   Training day   /   Rest day
                                                         (no "Today —" prefix, no claim about today)
```

The last case matters: on a user plan the app does not know which days are rest days, so it must show
the targets without asserting that either applies today. Same principle as C7a. `[Certain]`

**6. Recommended addition, not a correction.** One line under the macro grid giving him the *why*,
both numbers from the brief:

```
  Weekly average ~3,000 kcal against an estimated 2,700 maintenance. The 300 is the surplus.
```

`[Opinion]` — it is the one number that makes the other eight checkable, and it is what he will want
when the bodyweight trend disagrees with them.

### Worked examples

1. Sunday 2026-09-13, PHAT plan. Home strip: `Today — low-carb rest day`, `2,500 · 175 g · 60 g ·
   175 g`. Diet tab opens on the REST DAY segment. Under the design: `Today — high-carb training day`
   and 3,200/300.
2. **Boundary.** He taps TRAINING DAY on a Sunday. The grid shows 3,200/170/300/145, the label above
   the grid still reads `Training day` — no `Today —`, because he is looking at a day that is not
   today. A manual switch must not be able to produce the sentence `Today — high-carb training day` on
   a Sunday.
3. **Failing case.** A user plan with four training days and no declared rest days, opened on any day.
   Labels read `Training day` / `Rest day` with no `Today —`. The app shows the targets and makes no
   claim about which one applies, because it does not know. Same ruling shape as C7a.

---

## 8.7 What this needs that does not exist yet

Flagged as required. Every item below is a place where the honest answer is *this needs his real
training history, and there is none.*

1. **The `d2e` and `d3d` alternates.** Glute-ham raise or lying leg curl; DB row or shrug. Unknowable
   by reasoning. One logged Day 2 and one logged Day 4 settle both. Until then the plan carries a
   recorded default and the setup prompt exists to correct it.
2. **Bent-over or Pendlay.** Same. And it matters more than the other two, because `d1a` is an ST1 key
   lift and a style switch mid-block reads as a stall.
3. **R1's 120 s for power-day 6–10 work.** That number is my `[Opinion]` — the bottom of the brief's
   2–3 min band. It is calibrated on nothing. Two weeks of real Day 1 sessions would say whether the
   curls and skull crushers actually need two minutes.
4. **Every D1 trigger threshold.** Two consecutive failures, ≥ 2 of 4 lifts stalled, 9 weeks. Chosen to
   be hard to trip. Whether they fire at a sensible rate is unknown and unknowable until there is
   history, and I would rather they fired late than early.
5. **The eight diet numbers.** `[Guessing]` in the brief, by the brief's own tag, which is why the
   calibration protocol exists. **There are zero bodyweight entries in the app.** Fourteen daily
   weigh-ins turn all eight from estimates into a tested prescription, and nothing else will.
6. **B-45** (`fail → deload → fail`) remains deliberately unfilled, per §7.12. Unchanged by anything
   here.

---

## 8.8 Verdict

**Sign off on the redesign's programme with changes.** The design is a mock-up and its `BASE_PLAN` is
prop data; measured against the brief it is more accurate than B-55 feared — all 42 set counts, rep
ranges and `cut` flags are exact — and wrong in two places that matter.

| | |
|---|---|
| **(a)** | **Reject** all 8 reclassifications. Keep the coach-verified `k` values. And correct WO-004 §W1's list: `d2b` was never reclassified. |
| **(b)** | **Sign off with changes.** The design's three choices are probably right; the silence is the defect. Two are data problems (two ids each), one is display. `d2e`'s `implement` must change with the answer. |
| **(c)** | **Sign off with changes.** The extra-set feature is approved. Extras are excluded from P1 and from both sides of H1. The `EXTRA` badge must be computed from completed-set ordinal, not row index. |
| **(d)** | Copy delivered. **ST1's measurement may run on any plan that names key lifts; the brief's diagnosis may not run on any plan but PHAT or a faithful copy of it.** |
| **(e)** | **R1 confirmed per exercise.** Per-day rest is rejected as a stored field — wrong on 24 of 42 slots and actively wrong on the three speed slots. |
| **(f)** | **Numbers approved verbatim. Copy corrected in five places**, of which two are required: the medical caveat on 175 g of fat, and the hardcoded training-day label that shows 3,200 kcal on a rest day. |

Nothing here changes an `id`, `s`, `lo`, `hi` or `cut`. The single data-touching change is `d2e`'s
`implement`, and it is free only while the log is empty.

**And the standing point, since this is the fourth document I have written about a programme with zero
logged sessions.** Every ruling above is calibrated against a brief and my own judgement, not against
anything he has done. Rulings (b) items 1–3 and flag 3 in §8.7 would each be settled by a single
logged session. The advice layer is now more thoroughly specified than the training is performed, and
that gap is not something another work order closes.

---

# 9. The Plan Editor's advice consequences

**Added 2026-09-10, from QA and the W3/W4 build.** Eight items: the copied-plan history question, then
seven sign-offs.

---

## 9.1 Rule PE1 — is history before a prescription change still evidence?

**Neither of the first two framings. The third has the right shape and the wrong axis.**

The discriminator is not *which field changed*. It is **what the rule is asking the history for.**
Sort the rules by their question and the answer falls out:

- **Rules that ask "how much did you lift."** Load and reps as raw quantities. ST1's e1RM, SP1's
  heaviest 3–5 rep set, the trend chart, volume totals. **These cross a prescription change unchanged.**
  `[Certain]` — 100 kg × 5 is 100 kg × 5 whether the plan called for 3–5 or 8–12 that day. He lifted
  it. A rep range is a plan; a logged set is a measurement, and a plan edit cannot retroactively
  un-lift a weight.
- **Rules that ask "did you do what was prescribed, and how does that compare with the last time you
  did it."** H1's tonnage comparison, H1's baseline test, and `lastFor`'s ghost text and weight
  prefill. **These must not cross.** The comparison is only meaningful between two attempts at the
  same prescription.

So: **the history is always kept, always charted, never hidden, never re-keyed. What changes is
whether a given rule may compare *across* the change.** Framing 2's cost — "he loses his baseline
every time he edits" — only lands on the second class, which is where losing it is correct.

### First, a correction: the exposure is narrower and sharper than the question assumes

I checked each rule against what it actually reads. Three of the four named do not have the problem,
and one that was not named is the one with physical stakes.

| Rule | What it reads history for | Crosses an epoch? |
|---|---|---|
| **P1** | **Nothing.** Its inputs are `ex {s,lo,hi}` and *this session's* completed sets (`coach-audit.md` §3). It is history-free. | **n/a — not affected at all** |
| **`lastFor` → ghost + weight prefill** | "what you did last time", rendered as an implied target and typed into the weight box | **NO. This is the one that matters.** |
| **H1 cases 1–2** (range compliance) | nothing — this session only | n/a |
| **H1 case 3** (baseline test) | the previous entry's completed-set count | **NO** |
| **H1 case 4** (tonnage) | the previous entry's `C` tonnage | **NO** |
| **ST1 / `e1rmByDate`** | weight × reps, Epley, `r <= 8` | **YES — unaffected by construction** |
| **SP1 / `speedLoad`** | heaviest completed set at 3–5 reps in 28/56 days | **YES — self-limiting** |
| **D1 trigger T1** | a load *previously completed for the full prescription* | **YES — self-protecting, verified** |
| **Trend chart, volume totals** | weight × reps | **YES** |

**T1 self-protects and I checked it rather than assuming.** `logic.js:1896` `workingLoadStrict` returns
`null` below `n` completed sets, and T1's qualifying load must satisfy the *current* prescription. Move
`d1a` from 3–5 to 8–12 and his old `100×5/5/5` no longer counts as completed (5 < `lo` 8), so 100 kg is
not a "previously completed" load and cannot anchor a failure row. T1 goes quiet until he completes the
new prescription once. That is the right behaviour and it is already there. `[Certain]`

**SP1 self-limits.** Its filter is *reps in [3,5]*, so a source lift moved to 8–12 stops producing
candidates and SP1 ages out to its fallback within 28–56 days. The old triples it uses in the meantime
are genuine heavy triples and remain valid evidence. Only the fallback *copy* is wrong — see 9.1(c).

**The one with physical stakes was not on the list.** The design prefills the weight field from the
last session (`PHAT App.dc.html:629`, `w: prev && prev.sets[i] ? prev.sets[i].w : ""`). Across a
change from 3 × 3–5 to 3 × 8–12, that types his **3–5RM into an 8–12 slot**. He is in a gym with chalk
on his hands, the box says 100, and the target line says 8–12. `[Certain]` that is a failed rep under a
loaded bar, which is the cost CLAUDE.md tells me to weigh above all others. Everything else in this
question costs a wrong percentage; this one costs a rep he cannot rack.

### The rule

```
Rule: PE1 — prescription epochs
Applies to:   `lastFor`-driven ghost text and weight prefill; H1 cases 3 and 4. Session screen.
              NOT P1 (history-free). NOT ST1, SP1, the trend chart or any volume total.
Inputs:       the prescription in force when a set was logged: {s, lo, hi, k}.
              Cheapest shape: store it ON THE ENTRY at save time. Additive, self-describing,
              survives export/import, needs no plan-history machinery, and an ABSENT value means
              "same as current" — which is correct for every set logged to date, because nothing
              has been edited yet. `planId` cannot answer this: an in-place edit does not change it.
              Storage shape is backend's call; the rule needs the fact, however it is carried.
              Minimum data: none. This is a property of the plan and the entry, not of history size.
Logic:        epochKey = (s, lo, hi, k), compared by strict equality. No tolerance band.
              1. Same epoch  -> current behaviour, unchanged.
              2. Different epoch:
                 a. DO NOT prefill the weight field. Leave it empty.
                 b. Show the last set as history, explicitly labelled with the old prescription.
                    Never as a target.
                 c. H1 takes case 3 (baseline) with the epoch-change copy, not the
                    "First time logged" copy.
                 d. Once one session exists in the new epoch, everything resumes normally
                    against that session. The reset costs exactly one session.
              3. The history is never hidden, never re-keyed, never dropped from a chart or a
                 volume total, and no set is orphaned. Nothing here touches an id.
```

**Output copy**

```
Ghost row, across an epoch boundary (replaces "From your last session on this."):
  100 × 5, under the old 3 × 3–5. Pick a weight for 8–12.

Ghost row, across an epoch boundary, when only `k` changed:
  100 × 5, logged as power work. Pick a weight for the new range.

Verdict, first session in a new epoch (replaces H1's "First time logged. This becomes your baseline."):
  Prescription changed to 3 × 8–12. This is the new baseline. Your earlier sets are still in the
  history and on the chart.

SP1, when the source lift is no longer prescribed at 3–5 reps:
  Bent-over row is no longer prescribed at 3–5 reps, so there is no triple to work from.
  Point this speed work at a lift you train heavy, or set the load yourself.
  Until then: 65–70% of a weight you could triple.

ST1, when a key lift's `lo` is above 8 so no set can be read:
  Squat is prescribed above 8 reps, so the six-week check cannot read it. It needs sets at
  8 reps or fewer.
```

**Not enough data.** Not applicable — PE1 needs no history to decide. That is deliberate: the ghost
and the prefill are the first thing on screen in a new epoch, before any new set exists, which is
exactly when a stale target is most dangerous.

**Worked examples**

1. He copies PHAT, changes `d1a` to 3 × 8–12, opens Day 1. Last logged `d1a` was `100×5/5/5` under
   3 × 3–5. → different epoch → weight box **empty**, ghost reads
   `100 × 5, under the old 3 × 3–5. Pick a weight for 8–12.` He logs `70×10/10/10` → H1 case 3 →
   `Prescription changed to 3 × 8–12. This is the new baseline. Your earlier sets are still in the
   history and on the chart.` The trend chart shows all sessions, unbroken. ST1's e1RM reads
   `70×10`? No — `r <= 8` excludes it; it reads the older 5-rep sets until 8-rep sets arrive.
2. **Boundary — the deliberate over-trigger.** He changes `d3c` seated cable row from 3 × 8–12 to
   3 × 10–12. Trivial edit, and PE1 fires: one session of reset copy and no prefill. **I am taking
   that cost on purpose.** A tolerance band that decides 8–12 → 10–12 is "close enough" but 8–12 →
   8–15 is not would be a number I cannot defend, and getting it wrong prints a confident percentage
   comparing two different qualities of work. One session of "prescription changed" is cheap; a wrong
   `Volume up 50%` is the class of defect B-25 exists for. `[Opinion]`, conservative.
3. **Failing case — what ships today.** Copy the plan, change `d1a` to 8–12, log `70×10/10/10`
   against a previous `100×5/5/5`. Tonnage 2,100 vs 1,500 → `Volume up 40% — 2,100 kg against
   1,500 kg.` He did not get 40% better at anything. He changed the plan. And the session before it,
   the weight box offered him 100 kg for a set of 8–12.
4. **Crossing the other way.** 8–12 back to 3–5. Same reset, one session. His 8–12 history stays on
   the chart and stays in ST1's e1RM series wherever `r <= 8`, so the six-week check is continuous
   across both edits. That continuity is the whole reason the two classes are separated.

**Rationale.** A logged set is a measurement and a prescription is a plan; edits to the plan cannot
change what he lifted, so the rules that read quantities carry straight through. The rules that
compare against "last time" are asking a question that presumes the prescription held, and when it did
not the honest answer is a fresh baseline and a sentence saying why. The prefill ruling is not really
about comparability at all — it is about the app not typing a heavy-triple weight into a slot that now
asks for twelve reps.

**What this needs that does not exist.** How often he actually edits a prescription. If it is twice a
year, PE1's strict test is free. If he tunes ranges weekly, one session of reset copy each time will
become noise and the tolerance question comes back — with real data to answer it. Zero plan edits and
zero logged sessions exist today, so I am ruling conservative and expecting to revisit it. `[Guessing]`
on the frequency, `[Certain]` on the direction.

---

## 9.2 Item 1 — which name goes in ST1's sentence: **the plan's full name.** `[Certain]`

**`No progress on Bent-over row, Squat`. No `short` field, and no truncation in the view.**

My `Row, Squat` example predates the plan document, and **I am superseding it.** Three reasons, in
order of weight:

1. **Short labels for these four lifts is literally B-27.** `KEY_LIFTS` called a flat DB press "Bench"
   and a stiff-leg deadlift "Deadlift", and the backlog entry reads *"The mapping is right, the labels
   lie."* A `short` field is that defect with a schema slot to live in. The sentence that fires here is
   the app's most serious claim — six weeks, no progress, change something — and it must name the lift
   he actually did.
2. **A second name field is a second thing a rename has to keep in sync**, and C-6's entire ruling is
   one stable id and one display name. A rename that updates `n` and leaves `short` stale puts a dead
   name inside the stall sentence.
3. **On a user plan there is no short name to have**, so it would need a fallback to the full name
   anyway — and he would get `No progress on Row, Bulgarian split squat` in one sentence. Two formats
   is worse than one long one.

The sentence being longer is a real cost and I am accepting it. It reads fine: *"Week 7 and no progress
on Bent-over row, Squat."* And **not the view's business either** — truncating "Bent-over row" to
"Row" in a template is the same lie one layer down, where nobody will find it.

---

## 9.3 Item 2 — `reducedWeeks` defaults to 4: **sign off with a change.** `[Certain]`

**Reject the invisible default. Keep the visible one.**

The 4 is the brief's, for PHAT, for a lifter coming off a self-described low-intensity baseline into a
five-day split. It is not a general fact about reduced-volume blocks, and inferring it onto a plan
nobody assessed is the app prescribing a block length it has no basis for.

But "no default" must not mean the `cut` flags silently do nothing — he marked them, he meant
something by it.

```
Rule: V1a — block length on a plan that declares a cut tier
Applies to:   V1, on any plan where at least one exercise carries `cut` and the plan declares no
              block length. Plan editor and Train screen.
Inputs:       plan.reducedWeeks. No user history.
Logic:        The plan editor ASKS, at the moment he marks the first exercise `cut`. The picker is
              PRE-FILLED with 4 and is editable — visible suggestion, his choice, stored on the plan.
              If the value is absent (an imported or older plan): V1's block does NOT run. Every
              exercise renders from week 1, no reintroduction ramp, and the app says so. It does
              not silently assume 4 and it does not silently ignore the flags.
Output copy:  Editor prompt:  How many weeks at reduced volume before these come back?
                              Suggested: 4
              Absent value:   This plan marks accessories to cut but does not say for how long.
                              Set a block length in the plan, or they all run from week 1.
Not enough data: covered above — absence is a plan property, not a history property.
```

The distinction that carries the ruling: **a pre-filled 4 he can see and change is a suggestion; an
invisible 4 is a prescription.** Same 4, and only one of them is the app deciding his programme for
him. On PHAT the plan declares 4 explicitly and nothing changes.

---

## 9.4 Item 3 — what "31 sessions" counts: **change it.** `[Certain]`

**Count distinct dates carrying at least one completed set. Keep the word `sessions`.**

The number currently counts *saved sessions*, but it sits in the same line as a week number derived
from **TW1**, which ruled `[§6a]` that qualifying **distinct dates** are what count and that three
saves on one date is one day. Two numbers in one sentence must use one definition of a training day,
or the line contradicts itself: `Week 7 · 31 sessions` where 31 saves happened across 24 dates makes
the week count look broken, which is exactly the failure C-10 was raised to prevent.

The word `sessions` is right and should stay — a session is a gym visit, and two saves on one date is
one visit. The "at least one completed set" test is correct and matches B-33's ruling that an exercise
counts when it has a completed set. A save with a note and no sets is data worth keeping and is not a
training day.

---

## 9.5 Item 4 — `Log all four lifts weekly`: **confirm the fallback, and replace the string.** `[Certain]`

Correct catch — the string is false at any count but four, and after a plan edit it can be three. The
fix is not to count; it is to **name them**, which works at every count and is more useful anyway.

```
Output copy, ST1 thin-data, no lift testable (replaces `Log all four lifts weekly.`):
  Six weeks in but the log is too thin to test. Log Bent-over row, Flat DB press, Squat and
  Stiff-leg deadlift weekly.

Output copy, ST1 thin-data, some lifts testable: unchanged, per-lift.
  Not enough sessions on Stiff-leg deadlift to judge. Log it weekly.
```

Naming them degrades gracefully to three, two or one with no special case, tells him exactly what to
do, and never states a count that a plan edit can falsify. **Confirm the per-lift fallback** as
shipped — it was already the right shape.

---

## 9.6 Item 5 — `From your last session on this.`: **approve, conditionally.** `[Certain]`

Approve the line and approve shipping it in its own field. It is accurate, terse, and it answers the
question a ghost row raises.

**The condition is PE1.** That field is precisely where the epoch caveat has to live, so its content
is epoch-dependent:

```
Same epoch:      From your last session on this.
Different epoch: 100 × 5, under the old 3 × 3–5. Pick a weight for 8–12.
```

Keeping it in a separate field, never joined into the approved verdict text, is the right structure and
is what makes PE1 cheap to add. Ship it as-is today; it becomes conditional when PE1 lands.

---

## 9.7 Item 6 — `painState`'s clearing rule: **confirm, and add a time-based restatement.** `[Likely]`

**Confirm the engineer's reading.** A blank card is not evidence he trained it pain-free, and treating
"it appeared on screen" as an all-clear would let the notice be dismissed by scrolling past it. In §10
the word doing the work is `logs`, and the engineer read it correctly.

**But a notice that never changes for six weeks stops being read**, and the state it describes has
changed: he is not lifting through pain any more, he is avoiding the movement. That is a different
fact and the app may state it, because it is a fact about his log and not an assessment.

```
Rule: S1a — a pain notice with no subsequent entry
Applies to:   Rule S1's notice, per exercise id.
Inputs:       the date of the most recent matching note; whether any later session logged that
              exercise (completed set OR note). No new input.
Logic:        Clearing rule unchanged: the notice stands until a later session logs that exercise
              with no matching note.
              Additionally: if 21 days pass with no logged entry for that exercise, the notice text
              changes once. It NEVER becomes an all-clear and it never disappears on its own.
Output copy:  Within 21 days: unchanged, Rule S1's referral line.
              After 21 days:
                You noted pain on this on 14 Aug and have not logged it since. The app cannot tell
                you whether it has settled. If it still hurts, see someone qualified to look at it.
Not enough data: n/a.
```

The second string does what §10 requires: it states what the log says, declines to assess, and points
at a person. It does not ask him to test it, because "try it and see" is medical advice and is not the
app's to give. `[Certain]` on that constraint; `[Opinion]` on 21 days, chosen as three missed
opportunities at his five-day frequency.

---

## 9.8 Item 7 — `cycleLine` at `trainingWeeks === 0`: **give the zero case.** `[Certain]`

`Week 0 · 2 sessions` is wrong twice: there is no week 0, and it is the **first line he sees on day
one**, where looking broken is expensive. My shape did only cover `tw >= 1`; filling it now.

```
Rule: cycleLine, zero and pre-first-week states
Logic:  no sessions at all              -> the no-history line
        >= 1 session, trainingWeeks 0   -> no week number. State the count and what unlocks week 1.
        trainingWeeks >= 1              -> unchanged.
Output copy:
  No sessions logged yet.
  2 sessions logged. A training week is 3, so week 1 starts when you get there.
  Week 7 · 31 sessions          (unchanged, with 9.4's counting rule)
```

The middle line is the honest one: it explains the gap between what he has done and what the app
counts, which is the same explanation TW1 already gives at the other boundary
(`Week 5 by the calendar, week 3 of real training`). Never print `Week 0`.

---

## 9.9 The `removeExercise` undo — the copy is mine, the fix is not

The dangling-reference bug is engineering. Two coaching points on top of it.

**1. Fewer than four key lifts is a VALID plan.** Do not let `validatePlan` be "fixed" by requiring
four — a three-day full-body plan naming three lifts is legitimate, and a validator that rejects it
would block a plan to protect a test. `ok` is the right verdict. What is missing is not validity but
**disclosure**. `[Certain]`

**2. The app must say when the stall test loses a lift**, because ST1's whole authority is that it is a
four-lift check agreed in advance. Silently becoming a three-lift check and still printing the brief's
`[Certain]` diagnosis is the app narrowing its evidence base without telling him. Note this partly
self-corrects: dropping a key lift fails C7b's four-lifts-present test, so provenance goes FALSE and
the generic copy fires. He should still be told at the moment it happens.

```
Output copy, plan editor, on removing an exercise that is a key lift:
  Bent-over row is one of the lifts the six-week check reads. Removing it leaves 3.

Output copy, Trend tab, whenever ST1 runs with fewer than 4 declared key lifts:
  Reading 3 of 4 key lifts. Bent-over row is not in this plan.

Output copy, a speed slot whose source was orphaned: no new string. §8.4's SP1 ABSENT copy is
  already exactly right — `No source lift set for this speed work. Set one in the plan to get a
  number.` — which is a good sign that the absent state was specified at the right level.
```

---

## 9.10 Verdict on the eight

| | Ruling |
|---|---|
| **PE1** | Neither framing. **Measurements cross a prescription change; prescription-relative comparisons do not.** History is never hidden or re-keyed. P1 is unaffected (history-free); T1 and SP1 self-protect, verified. **The real hazard is the weight prefill**, which types a 3–5RM into an 8–12 slot. Copy given. |
| **1** | **Plan's full name.** `Bent-over row, Squat`. No `short` field — that is B-27 with a schema slot. My `Row, Squat` example is superseded. |
| **2** | **Sign off with a change.** Pre-fill 4 in a visible, editable picker; never apply it invisibly. Absent value → the block does not run and the app says so. |
| **3** | **Change it.** Count distinct dates with ≥ 1 completed set. Keep the word `sessions`. It must share TW1's definition or the line contradicts itself. |
| **4** | **Confirmed**, and the string replaced: **name the lifts, never count them.** |
| **5** | **Approved**, conditional on PE1 — that field is where the epoch caveat lives. Ship as-is today. |
| **6** | **Confirmed.** Plus a one-time restatement after 21 days that names the avoidance, declines to assess, and points at a person. Never an all-clear. |
| **7** | **Zero case given.** Never print `Week 0`. |
| **undo** | Fewer than 4 key lifts is a **valid** plan — do not "fix" the validator. Disclosure copy given for the editor and the Trend tab. |

Nothing in §9 changes an `id`, `s`, `lo`, `hi`, `cut` or `k` value, and nothing orphans a logged set.
PE1 asks for one additive field on the entry and is otherwise pure copy and gating. Three items (9.4,
9.5-conditional, 9.8) change strings that are shipping; the rest are additive.

---

## 9.11 PE1 build — three copy calls, one withdrawal

**Added 2026-09-10.**

### 1. Which set the ghost names: **confirm heaviest, ties to earliest.** `[Certain]`

Not for consistency with `topSet` — for a better reason. **"Last set" is a row-order artefact, and X1
makes it wrong outright.** Take `100×5, 100×5, 100×5, 80×8 [EXTRA]`: the last set is the back-off,
which X1 already rules cannot describe the prescription. Naming it in the one sentence he reads while
deciding what to load would hand him the least representative number in the entry. "Heaviest completed
set" is stable, explainable and unaffected by blanks, extras and row order.

The counter-argument is real but it does not survive the direction test. Going 3–5 → 8–12 the heaviest
anchors him high, which is the dangerous direction; going 8–12 → 3–5 it anchors him low, which is not.
A rule that flips on the direction of the edit is fiddly, hard to test, and buys little — because the
sentence's job is not to suggest a number at all. That is carried by the second clause, which must
stay: `Pick a weight for 8–12.` As long as that clause is present, the first number is history rather
than a target, and the honest history is the heaviest set.

### 2. `kWord`: **all four approved as written.** `[Certain]`

Including `hyp → "hypertrophy work"`, and deliberately. The flag is fair on register, but **the app
already uses "hypertrophy" as its own word in three of five day names** — *Back & shoulders
hypertrophy*, *Lower hypertrophy*, *Chest & arms hypertrophy*. Introducing a warmer synonym here means
one concept with two names, which is the defect in B-27 and the reason I rejected a `short` field in
§9.2 an hour ago. Consistency beats register when the alternative is a second vocabulary.

`speed work` is the app's own term (it is literally in the exercise names). `power work` stands.

On `unknown k → ", logged under a different role."`: approved, with a rider that costs nothing because
it is already true — **if `k` is unrecognised, no verdict may fire for that exercise.** An app that
cannot tell which rule applies must not run one. C-7 makes this unreachable from the editor, so it only
appears on corrupt or imported data, which is exactly when guessing is worst.

### 3. The per-row ghost across an epoch: **it disappears.** `[Certain]`

Not captioned — gone. The provenance line alone carries it.

`Last 100 × 5` sitting beside a deliberately-emptied weight box **is** a target, whatever caption is
attached to it, and PE1's entire purpose is that those numbers stop reading as targets. Three or four
rows each repeating the old prescription also re-inflates the string that B-37 measured at zero width
at 400 px — the redesign moved that hint to its own full-width row to fix exactly that, and this would
undo it. Say it once, above, in full width.

### The conflict: **X1's line ships. I withdraw the UX §4.5 line.** `[Certain]`

`Set 4 is beyond the prescription. It counts in volume; the target does not change.` is accurate and
answers the wrong question. The question a man asks after logging a fourth set is *did that count?* —
and "the target does not change" is about the prescription line, not about the advice. Only X1's
version answers it: `The verdict reads the first 3.` X1 is also role-specific, which matters, because
the correct message on a 3 × 3–5 squat (this is fatigue you will pay for tomorrow) is not the correct
message on a lateral raise (fine, logged, counted).

Backend read the precedence right. The one thing worth carrying over from the withdrawn line is its
concreteness — where `n === 1`, prefer `Set 4 is past the prescription. The verdict reads the first 3.`
over `1 set past the prescription.` Plural rows keep X1's counted form.

### The two implementation notes

**A deload is not an epoch — confirmed, and it is the right call for the right reason.** `[Certain]` A
deload is a temporary instruction *inside* a prescription, not a change to it: the plan still says
3 × 3–5, and DL1 says do two of them this week. `rxOf` returning null on `dl:1` is correct. Announcing
`Prescription changed to 2 × 3–3` would be false on its face — `3–3` was never prescribed — and
emptying his weight box during a deload would remove the one thing a deload week guarantees, which is
that the loads stay put. This is the same principle as E2, one layer down.

**`d2e` → `Lying leg curl`, `implement: "machine"` — correct, and asking him directly is right.** That
is flag 1 in §8.7, and "one line now, never clean again once there is history" is precisely the shape
of it. Give him the trade in one sentence: a glute-ham raise is the better exercise if he can already
do controlled sets of ten; the lying curl is the one that progresses in 5 kg steps and is in every gym.
`[Opinion]`, and it is his call, not mine.

---

## 9.12 The unclassified-`k` rider, at its edges

**Added 2026-09-10.**

### 1. The rider extends to both. **Both go silent, and the verdict slot explains why.** `[Certain]`

`incrementLine` is the clearer of the two: **it is load advice.** *"If 2.5 kg is not available, add
reps up to N first, then jump"* is a prescription for how to progress, and an app that cannot classify
the exercise must not prescribe how to load it. There is also a mechanical reason it cannot run —
§I2's rule is that `bb` and `k:"speed"` get **no** line at all, so I2 already depends on `k`. With `k`
unrecognised the exclusion cannot be evaluated, so the only honest output is nothing.

`extraSets` looked different to me at first, because it is a statement of fact rather than advice —
*did that set count* is a fair question and silence is a poor answer to it. But every one of its three
variants is false here. `Counted in today's volume, not in the verdict` implies a verdict exists;
`The verdict reads the first 3` names one that will never fire. **There is no honest fourth variant,
because the true sentence is not about the extra set at all — it is about the exercise.** So it goes
silent too, and the fact moves to the slot that owns it.

```
Output copy, verdict slot, k not in PLAN_KINDS:
  No role set for this exercise, so the app cannot advise on it. Set it to power, hypertrophy or
  speed in the plan.
```

That satisfies `wo-003-session-screen.md` §0.1 #3 — silence looks deliberate and the slot says so in
words — and it is the same ABSENT shape as §8.4: name the missing declaration, say what switches the
feature on, never guess. One fact, one place, and the fact is "this exercise is unclassified", not
"your fourth set did or did not count".

### 2. Shared head clause: **confirm.** Row number: **confirm.** `[Certain]`

The shared head is right, though not quite for the cited reason — §9.2 and §9.11 were about one
*concept* carrying two *names*, and this is one factual clause preceding three role-specific tails,
which is more consistent rather than less. Right answer, adjacent principle. All three read cleanly:

```
Set 4 is past the prescription. The verdict reads the first 3.
Set 4 is past the prescription. Counted in today's volume, not in the verdict.
Set 7 is past the prescription. Speed work is 6 sets. Extra sets are extra fatigue.
```

The speed one lands best of the three — naming set 7 and then restating that the prescription is six
does the work in six words.

**Row number is correct and it does not contradict §8.3.** The two rules govern different things and
both point at the same physical row:

- §8.3 governs **which rows carry the badge** — completed-set ordinal, because the badge means "this
  row cannot affect the verdict", and that is a fact about completed sets.
- This governs **what number the copy prints** — the row number, because the copy has to name
  something he can point at, and the rows are numbered on screen.

On rows 1, 3, 4, 5 filled on a 3-set exercise: row 5 is the fourth completed set, it carries the
badge, the screen labels it 5, and the copy says `Set 5`. Printing `Set 4` there would relocate the
prototype's lie rather than fix it — which is the argument I made in §8.3, turned the right way round.
**Do not "fix" either one to match the other.** That is the likeliest future regression in this area,
so it is worth a comment at both sites.

The plural stays a count of extras (`2 sets past the prescription`) rather than a row name. Consistent:
the singular names a row, the plural counts completed extras, and on any log they agree about which
rows are involved.

### 3. Day one: one deliberate line. `[Certain]`

An empty string is the wrong first thing an app ever says, and this one has a specific reason not to
be vague — the standing diagnosis in CLAUDE.md §8 is that the training is the bottleneck, not the
tooling. **The first sentence should point at a session, not at the app.**

```
Output copy, cycleLine:
  zero sessions:            No sessions logged. Start with Upper power.
  >= 1 session, tw === 0:   2 sessions logged. A training week is 3, so week 1 starts when you get there.
  tw >= 1:                  unchanged.
```

`Upper power` is read from the first day of the active plan, so the line works on any plan with no
PHAT-specific branch. It is imperative, it names the next action, and it makes no claim about the
calendar — he can open the app on a Thursday and the programme still begins at day one.

**Precedence at one to two sessions: the count line wins over the reduced-volume line.** Both are
true, but at `tw === 0` the number that looks broken is the week count, and the count line is the one
that explains it — the same job TW1's `Week 5 by the calendar, week 3 of real training` does at the
other boundary. The reduced-volume fact is not urgent and is correct from week 1 onward, where it
already renders. This confirms §9.8 rather than changing it; only the zero-session string is new.

---

## 9.13 Three edges of §9.12

**Added 2026-09-10.**

### 1. The badge goes silent too. **Confirm.** `[Certain]`

The engineer is applying my own definition correctly, and the counter-argument asks me to change that
definition to rescue the badge. §8.3 says, in the rule block: *"The badge means 'this row cannot
affect the verdict', so it must be computed the same way C is."* That verdict-relative meaning is the
entire reason I insisted on completed-set ordinal over row index. With no verdict possible the claim
is vacuous, and reclassifying the badge as a layout fact now would retroactively undermine the
argument that fixed it.

It also adds nothing as a layout fact: the target line already says `3 × 8–12` and the row is already
numbered 4. And on a card whose whole message is *I cannot tell you anything about this exercise*, an
amber badge with no line beside it is a mark he cannot interpret — noise shaped like information.

One object, one answer to an unrecognised `k`. That resolves QA's contradiction properly rather than
narrowing it.

### 2. The day-one string everywhere: **confirm, that is the reach I intended.** `[Certain]`

`No sessions logged. Start with <first day>.` is strictly better than `No sessions logged yet.`
wherever a first day can be named — it points at an action instead of stating an absence — and
keeping the old string as the fallback for a plan that cannot name one is exactly right.

No interaction with the cut tier: whether a plan phases accessories in has nothing to do with where
the programme begins, and V1's ABSENT copy lives on the plan screen, not in `cycleLine`. Two
independent facts, correctly left independent.

### 3. `A training week is 3` after three sessions: **amend the wording.** `[Certain]`

Not a special case — my §9.8 phrasing is simply wrong at any count where the number collides, and
three is only the most visible one. The clause states the rule as a *count* (`a training week is 3`)
when the rule is actually about *concentration* (three in one week). At three sessions the count
reading is flatly confusing, and it was never the right description even at one.

```
Output copy, cycleLine, >= 1 session and trainingWeeks === 0 (replaces §9.8's line):
  3 sessions logged. Week 1 starts when three land in one week.
```

Reads correctly at every count — `1 session logged.` / `2 sessions logged.` / `7 sessions logged.`
— and it now says the thing that is actually true of his log: he has the sessions, they are spread
out, and concentration is what is missing. No branch, no count of calendar weeks, one string. **This
supersedes the second line of §9.12's `cycleLine` block and §9.8's middle line.**

The engineer was right not to invent copy for it. It was mine to fix.

### The two implementation details — both endorsed, no change

**Reading raw `ex.k` rather than a trimmed copy is correct.** A gate that normalises more leniently
than the rule it guards is not a gate. `" hyp "` collecting hypertrophy copy in `extraSets` while
`verdict()` refuses it is precisely the split the rider exists to close, and tolerating whitespace
here would hide a data defect rather than surface it.

**The ABSENT-shaped return with the sentence in `absentLine`, never in `x`, is better than what I
specified.** It keeps `null` meaning "nothing to say" and gives "no verdict, and here is why" its own
shape — which is `wo-003-session-screen.md` §0.1 #6, *advice and refusal must be visually
distinguishable*, enforced in the data rather than left to a template. That is the right layer for it,
and it is the same separation §9.6 asked for on the ghost line. Carry it.

---

# 10. The 42 exercise cues — Rule Q1

Written 2026-09-10. Answers `wo-004-screens.md` §11.7, which makes the 42 cues mine to approve, and
the four questions raised with them. `PHAT_PLAN` carries 40 transcribed from the design prototype
and two empty slots (`d2e`, `d3d`). **Nothing had ever reviewed the wording.** This is that review.

**Verdict: sign off with changes. 8 kept, 32 amended, 2 new.**

## 10.0 Rulings at a glance

| # | Question | Ruling |
|---|---|---|
| — | The 40 transcribed cues | **8 survive as written.** 32 are amended: 11 for carrying two or three instructions, 9 for restating what §11.5 requires the figure to draw, 4 for a tempo prescription, 3 for stating a load, 2 for an assessment, 3 editorial. |
| — | Length | **None of the 40 exceeds 90 characters.** Longest transcribed is `d2a` at 74. Longest of mine is `d3d` at 58. The flag comes back negative — that constraint was never at risk. |
| — | Worst of the 40 | `d4d` `These should burn.` — an assessment, forbidden outright, and not an instruction about anything. |
| 1 | `d2e` / `d3d` | Written for the exercise as it stands (lying leg curl, DB row). One-line revert string given for each alternate in §10.5. |
| 2 | Should cues disambiguate the four confusable pairs | **No.** The artwork carries that load and §11.8(5) already gates the artwork on it. A cue may name a feature that happens to separate a pair, but only when it would say the same thing if the twin did not exist. §10.3. |
| 3 | Seven slots on `curl` / `tri`, all sharing the fixed upper arm | **Ruled: none of the seven says it.** The fixed upper arm is what §11.5 makes the figure draw, and all seven slots have better un-drawable content — the pad, the thigh, the forehead, the rope, the torso. §10.3. |
| 4 | The three speed slots | **They keep a cue, and it is the parent lift's cue verbatim.** All three current strings are struck: they state a load, they duplicate `speedLoad().text`, and one duplicates `speedLoad().instruction`. §10.4. |
| — | Distinct strings | 42 slots, **32 distinct strings.** Ten pairs of slots run the same movement and get the same cue. §10.2. |
| — | Not mine, but found while in here | Three slots are mapped to a figure of a different exercise (`d3c`, `d4c`, and `d3d` if it becomes a shrug). §10.7. |

---

## 10.1 Rule Q1 — the exercise cue

```
Rule: Q1 — the per-slot movement cue
Applies to:   every slot in a plan document, all roles (power | hyp | speed). Renders only in the
              Session screen's MOVEMENT & CUE disclosure (§4.13). It is not advice about a set, it
              does not read history, and no rule reads it.
Inputs:       none. The cue is plan data, fixed at authoring time. It is a function of the
              exercise, never of the log, the week, the load or the verdict.
Logic:        The cue carries exactly one instruction, chosen in this order:
              1. If the movement has a SETUP position that is wrong more often than it is right and
                 that a 64 px figure cannot show — pad height, seat height, grip width, bench angle,
                 foot placement, where the knee sits relative to a machine's pivot — the cue is that.
              2. Otherwise the single most common EXECUTION error, preferring one that is dynamic
                 (changes across a rep or across a set), because a two-pose figure cannot draw a
                 change.
              3. Only if neither exists, the prohibition of a state the figure draws (see below).
              A cue names ONE SUBJECT — one body part, one implement, one position. A second clause
              is allowed only when it names the specific error the first clause prevents and asks
              for no new action. `Ribs down, do not arch the lower back.` is one thing.
              `Torso near-parallel, pull to the navel, no hitching.` is three.
              THE PROHIBITION PRINCIPLE, which decides most of the overlap questions: a figure can
              only draw the correct state; it cannot draw the prohibition. A viewer reads a drawn
              flat lower back as unremarkable, not as an instruction. So a cue MAY name a
              prohibition of something §11.5 draws — but only where step 1 and step 2 found nothing
              better for that slot. This is what stops seven curl and triceps slots all saying
              "upper arm still".
Output copy:  the string in §10.2. One sentence, imperative, second person, <= 90 characters, no
              exclamation mark, no emoji.
              Forbidden, per §11.7 and enforced here: a rep range, a kilogram figure or a
              percentage, a tempo prescription, a safety claim, "if it hurts", a named substitute
              exercise, any assessment of the set or the lifter.
              A setup ANGLE is not a load and is not a tempo. `Set the bench to 30–35°, no steeper.`
              is permitted and is the only number in the 42.
              [Corrected 2026-09-11 to match §10.2's table, which is the copy of record. This line
              previously read `Set the bench to 30-35 degrees, no steeper.` — a paraphrase, never a
              second candidate string. See §12.2.]
              "Do not bounce out of the bottom position." is an error correction, not a tempo
              prescription. The line is: a tempo prescription names a duration or a count
              ("pause a beat", "slow return", "three seconds down"). Naming a technique fault does
              not. The four struck for tempo all named a duration.
Not enough data: a cue is authored, not inferred, so the insufficient-data state is not statistical
              — it is "I have not seen this exercise done". Where I could not choose the single most
              common error without watching him lift, the cue falls back to step 1, the setup
              position, which is true independent of who is lifting. Five slots are flagged in
              §10.6. A slot with no cue renders NO disclosure control at all (§4.13) — no empty
              box, no placeholder. After this document that state is reachable only from a
              user-created exercise, never from PHAT.
Worked examples:
  1. d2a Squat. Step 1 finds no setup non-negotiable a figure cannot show (bar on the back is
     drawn). Step 2: at 3-5 reps the hips rising ahead of the shoulders is the most common failure
     and is a change across a rep, which two poses cannot draw. ->
     `Drive the hips and shoulders up together.`
  2. d5e Preacher curl. Step 1 finds one: the upper arms on the pad. The generic `curl` figure has
     no pad, so this is un-drawable and it beats the fixed-upper-arm point at step 3. ->
     `Keep the upper arms flat on the pad.`
  3. BOUNDARY. d1f Seated DB shoulder press. Step 1: nothing (the seat with a back pad is drawn).
     Step 2: the lower back arching under a heavy press — but §11.5 makes the `vpush` figure draw
     "ribs down" at the finish. Step 3 applies, because there is no better content for this slot,
     and the drawn state reads as unremarkable. -> `Ribs down, do not arch the lower back.` KEPT.
  4. FAILING CASE, from the prototype. d4d Leg extension: `These should burn.` It is an assessment,
     it instructs nothing, it is unfalsifiable, and a lifter who does not feel it will add load to
     chase a sentence the app printed. Struck. Replaced with the slot's real error.
  5. FAILING CASE, from the prototype. d3a `65-70% of your power-day top set. Moved fast, never
     ground.` States a load, restates `speedLoad().text`, restates `speedLoad().instruction`, and
     is two sentences. Every clause belongs to a rule that already owns it. Struck. §10.4.
Rationale:    The figure and the cue are one unit with one job between them, so anything the figure
              carries is a wasted cue and there are only 42 of them. Choosing setup over execution
              where both are available is deliberate: a setup error is decided before the first rep
              and persists for every set, an execution error costs one rep. And a wrong cue is a
              cheap thing to write and an expensive thing to un-learn.
```

---

## 10.2 The 42

`K` = kept verbatim · `A` = amended · `N` = new. `Chars` is the final string. Basis: `[Certain]`
mechanical or geometric fact · `[Convention]` standard coaching practice, not physiology ·
`[Opinion]` my choice among several defensible candidate errors.

### Day 1 — Upper power

| id | Name | Final cue | Chars | K/A/N | Why changed | Basis |
|---|---|---|---|---|---|---|
| d1a | Bent-over row | `Keep the torso at the same angle for every rep.` | 47 | A | Three instructions; "pull to the navel" restates the arrow and contradicts §11.5's finish (lower ribs) | `[Convention]` |
| d1b | Weighted pull-up | `Reach a full dead hang at the bottom of every rep.` | 50 | A | "Chest to the bar" is the figure's finish; "control the descent" is a tempo prescription | `[Convention]` |
| d1c | Rack chin | `Rest the heels on the rack without pushing through them.` | 56 | A | Two instructions; "squeeze at the top" is the arrow's endpoint and instructs nothing | `[Opinion]` |
| d1d | Flat DB press | `Keep each wrist stacked under the dumbbell.` | 43 | A | "Elbows at 45°" is drawn by §11.5; "dumbbells stacked over the wrists" is backwards | `[Certain]` |
| d1e | Weighted dip | `Keep the shoulders down, away from the ears.` | 44 | A | The prototype was an if/then choosing between two variations, which is two cues and a substitution | `[Opinion]` |
| d1f | Seated DB shoulder press | `Ribs down, do not arch the lower back.` | 38 | A | Kept in substance — contraction normalised only. Rule Q1 step 3, worked example 3 | `[Convention]` |
| d1g | Cambered bar curl | `Do not rock the torso to start the rep.` | 39 | A | "Elbows pinned at the sides" is exactly what §11.5 makes the `curl` figure draw | `[Convention]` |
| d1h | Skull crusher | `Take the bar to the forehead on every rep.` | 42 | A | "Elbows still" is drawn; the bar's destination is not, and it is what defines this slot | `[Convention]` |

### Day 2 — Lower power

| id | Name | Final cue | Chars | K/A/N | Why changed | Basis |
|---|---|---|---|---|---|---|
| d2a | Squat | `Drive the hips and shoulders up together.` | 41 | A | Three instructions, one of which ("break at the hip and knee together") is the `squat`/`hinge` distinction the figure exists to carry | `[Convention]` |
| d2b | Hack squat | `Set the feet high enough that the heels stay down.` | 50 | A | "Full depth before the knees drift forward" reads as two conflicting instructions and resolves to neither | `[Opinion]` |
| d2c | Leg extension | `Keep the hips down in the seat, do not swing the pad up.` | 56 | A | "Pause a beat at lockout" is a tempo prescription — forbidden outright | `[Convention]` |
| d2d | Stiff-leg deadlift | `Keep the lower back flat for the whole rep.` | 43 | A | Three instructions; "push the hips back" and "bar close" are both drawn by §11.5 | `[Convention]` |
| d2e | Lying leg curl | `Line the knees up with the machine's pivot.` | 42 | **N** | No cue existed. See §10.5 for the glute-ham raise revert | `[Certain]` |
| d2f | Standing calf raise | `Keep the knees straight on every rep.` | 37 | A | "Full stretch at the bottom" is the figure's start pose; "pause at the top" is a tempo prescription | `[Certain]` |
| d2g | Seated calf raise | `Do not bounce out of the bottom position.` | 41 | A | "Slow" is a tempo prescription. The bounce half was right and is kept | `[Convention]` |

### Day 3 — Back & shoulders

| id | Name | Final cue | Chars | K/A/N | Why changed | Basis |
|---|---|---|---|---|---|---|
| d3a | Row — speed work | `Keep the torso at the same angle for every rep.` | 47 | A | Stated a load, duplicated two signed-off `speedLoad` strings. §10.4 | `[Convention]` |
| d3b | Rack chin | `Rest the heels on the rack without pushing through them.` | 56 | A | Same movement as d1c, same cue | `[Opinion]` |
| d3c | Seated cable row | `Keep the torso still, do not swing back with the weight.` | 56 | A | "Drive the elbows back" restates the arrow | `[Convention]` |
| d3d | DB row | `Keep the shoulders square, do not twist to finish the rep.` | 58 | **N** | No cue existed. See §10.5 for the shrug revert | `[Convention]` |
| d3e | Close-grip pulldown | `Set the lean once and hold it for every rep.` | 44 | A | "Pull to the collarbone" is the arrow's endpoint; the lean was the real content and is now the whole cue | `[Opinion]` |
| d3f | Seated DB press | `Ribs down, do not arch the lower back.` | 38 | A | "Press in a shallow arc" is the arrow. Same movement as d1f, same cue | `[Convention]` |
| d3g | Upright row | `Take a grip wider than shoulder width.` | 38 | A | Both prototype clauses are drawn by §11.5 (elbows above the hands, bar at the lower chest) | `[Convention]` |
| d3h | Lateral raise | `Raise the weight without help from the hips.` | 44 | A | Two instructions; "little fingers high" is a contested internal-rotation cue, not a non-negotiable | `[Opinion]` |

### Day 4 — Lower hypertrophy

| id | Name | Final cue | Chars | K/A/N | Why changed | Basis |
|---|---|---|---|---|---|---|
| d4a | Squat — speed work | `Drive the hips and shoulders up together.` | 41 | A | Stated a load and a rest period, duplicated `speedLoad`. §10.4 | `[Convention]` |
| d4b | Hack squat | `Set the feet high enough that the heels stay down.` | 50 | A | `Depth before load.` is a programming opinion, not a positional cue, and it names a load | `[Opinion]` |
| d4c | Leg press | `Do not let the lower back round off the pad.` | 44 | A | Kept in substance — contraction normalised only. The best single cue in the transcribed 40 | `[Convention]` |
| d4d | Leg extension | `Keep the hips down in the seat, do not swing the pad up.` | 56 | A | `These should burn.` is an assessment. Worst of the 40 | `[Convention]` |
| d4e | Romanian deadlift | `Do not add knee bend to reach lower.` | 36 | A | Three instructions; "hamstrings loaded" is anatomy, not a position. This is also what separates the RDL from d2d | `[Convention]` |
| d4f | Lying leg curl | `Line the knees up with the machine's pivot.` | 42 | A | "Curl to the glutes" restates the arrow; "hips down" is drawn. Same movement as d2e, same cue | `[Certain]` |
| d4g | Seated leg curl | `Set the lap pad tight enough that the hips cannot lift.` | 55 | A | "Full range" instructs nothing; "slow return" is a tempo prescription | `[Certain]` |
| d4h | Donkey calf raise | `Keep the hips bent at the same angle for every rep.` | 51 | A | "Deep stretch each rep" is the figure's start pose | `[Convention]` |
| d4i | Seated calf raise | `Do not bounce out of the bottom position.` | 41 | A | Same movement as d2g, same cue | `[Convention]` |

### Day 5 — Chest & arms

| id | Name | Final cue | Chars | K/A/N | Why changed | Basis |
|---|---|---|---|---|---|---|
| d5a | Flat DB press — speed work | `Keep each wrist stacked under the dumbbell.` | 43 | A | Stated a load and a rest period, duplicated `speedLoad`. §10.4 | `[Certain]` |
| d5b | Incline DB press | `Set the bench to 30–35°, no steeper.` | 36 | A | "Elbows tucked" is drawn. The bench angle is the setup non-negotiable and survives | `[Convention]` |
| d5c | Machine chest press | `Set the seat so the handles line up with mid-chest.` | 51 | A | "Squeeze at the end of the press" is the arrow's endpoint plus an unfalsifiable instruction | `[Certain]` |
| d5d | Incline cable fly | `Hold the same slight elbow bend throughout.` | 43 | A | Substance kept, made imperative. The one cue whose content the figure also carries — see §10.6 | `[Convention]` |
| d5e | Cambered bar preacher curl | `Keep the upper arms flat on the pad.` | 36 | A | "No swinging off the pad" names the wrong error; the elbows lifting off the pad is the error | `[Convention]` |
| d5f | DB concentration curl | `Brace the elbow against the inner thigh.` | 40 | A | Two instructions, and "supinate hard" is the only "hard" in the 42 | `[Convention]` |
| d5g | Spider curl | `Keep the upper arms vertical throughout.` | 40 | A | Substance kept — `Arms hanging vertical.` is a fragment, not an imperative, and "arms" should be "upper arms" | `[Certain]` |
| d5h | Close-grip bench | `Take a shoulder-width grip, no narrower.` | 40 | A | Two instructions; "elbows in" is drawn by §11.5 | `[Convention]` |
| d5i | Skull crusher | `Take the bar to the forehead on every rep.` | 42 | A | `Elbows still.` is drawn. Same movement as d1h, same cue | `[Convention]` |
| d5j | Rope pressdown | `Spread the rope at the bottom.` | 30 | **K** | Kept verbatim. One subject, un-drawable (the figure has no rope), fixes the real error (incomplete extension) | `[Convention]` |

**Transcription notes for backend.** `d5b` contains an en dash (U+2013) and a degree sign (U+00B0);
`d2e` and `d4f` contain an apostrophe (U+2019 is NOT wanted — use the ASCII `'`, escaped or in a
double-quoted string, to match `machine's` above and the rest of the file). No cue contains a
double quote, a newline or a character outside Latin-1. All 42 pass `esc()` unchanged.

**Ten pairs share a string** — 42 slots, 32 distinct cues: d1a/d3a, d1c/d3b, d1d/d5a, d1f/d3f,
d1h/d5i, d2a/d4a, d2b/d4b, d2c/d4d, d2e/d4f, d2g/d4i. **This is correct and is not a shortcut.** The
per-slot upgrade means every slot HAS a cue, not that all 42 differ. A rack chin's most common error
does not change between 6-10 and 8-12 reps, and printing two different cues for one movement teaches
him that one of them is optional. Where the role genuinely changes the error I would have split them;
it does not, in any of the ten.

---

## 10.3 Questions 2 and 3 — the confusable pairs, and the seven fixed-upper-arm slots

**Question 2: should the cues carry the disambiguation load? No. `[Certain]`, on the spec's own terms.**

Four reasons, the first of which settles it alone:

1. A cue that says "this is not the other exercise" is a **comparison**, and a comparison is not one
   of the two permitted contents (§11.7: the single positional non-negotiable, or the single most
   common error). It is closer to an assessment, which is forbidden.
2. §11.8(5) — *put `squat` and `hinge` side by side: nobody confuses them* — is an acceptance test on
   **the artwork**, and §11.8 says a figure that fails its tests does not ship. Moving that burden
   into the cue lets a failing figure ship behind a sentence propping it up.
3. He is never choosing between the pair. The cue sits under the exercise **name**, inside a session
   that named the day and the slot. The confusion §11.5 is guarding against is a figure that reads
   as the wrong movement at a glance — a drawing problem with a drawing fix.
4. There are 42 cues and each has one slot. Spending one on a comparison spends the slot's real
   content.

**The permitted overlap, stated as a test.** A cue may name a feature that happens to separate a
confusable pair when it would say exactly the same thing if the twin did not exist. `d4e`
`Do not add knee bend to reach lower.` separates the RDL from a squat pattern, and would be the
right cue on a planet with no squats. That is fine. `Do not turn this into a squat.` is not.

**Question 3: the seven `curl` / `tri` slots — d1g, d5e, d5f, d5g, d1h, d5i, d5j. Ruled: none of the
seven says "upper arm still". `[Certain]`.**

The premise of the question is right — seven identical cues would be seven wasted slots — but the
resolution is not "say it once and leave six blank". §11.5 already requires the fixed upper arm to be
**visibly fixed in both figures**; it is the one thing those two figures are specified to carry, and
it is the shared point of the pair the artwork is being redrawn to separate. A cue repeating it adds
nothing at any of the seven.

What settles it is that all seven have better content, and it took no straining to find:

| slot | What the figure cannot draw | Cue |
|---|---|---|
| d1g | that a standing curl is loaded enough to make the torso move — a static figure cannot draw a sway | the torso |
| d5e | there is no preacher pad in the generic `curl` figure | the pad |
| d5f | there is no thigh in it either | the thigh |
| d5g | there is no bench, and the spider curl's whole definition is where the arms hang | arms vertical |
| d1h | the generic `tri` figure folds a forearm; it does not locate the bar relative to the head | the forehead |
| d5i | same movement as d1h | the forehead |
| d5j | there is no rope in the figure | spread the rope |

So the answer is neither "the right emphasis" nor "a wasted slot repeated seven times" — it is that
the emphasis belongs to the artwork, and the seven cues are free for the seven things the artwork
cannot hold. If the redrawn `curl` and `tri` figures fail §11.8(5) in review, **fix the figures**;
do not buy them back with seven sentences.

---

## 10.4 Question 4 — the three speed slots

**Ruled: `d3a`, `d4a` and `d5a` keep a cue, and it is the parent lift's cue verbatim. All three
current strings are struck. `[Certain]`.**

The three transcribed strings:

```
d3a  65–70% of your power-day top set. Moved fast, never ground.
d4a  65–70%. Explosive out of the hole, short rest.
d5a  65–70%. Fast off the chest, short rest.
```

Every clause in all three belongs to a rule that already owns it, and owns it better:

| Clause | Who owns it | What that rule prints |
|---|---|---|
| `65–70%` | Rule SP1 | `67.5 kg. 65–70% of your 100 kg triple. Rest 60–90 s. Fast, never grinding.` — a **kilogram**, computed, which is the entire point of B-12. The cue prints a percentage he has to do arithmetic on with chalky hands, which is the defect B-12 exists to remove. |
| `power-day top set` | Rule SP1 | And it is **wrong** — audit §7 struck "top set" explicitly, because a top set is not a 3–5RM. This is a defect the app already fixed, still sitting in a string. |
| `never ground` / `fast` | `speedLoad().instruction` | `If a rep slows down, the set is over. Cut the weight, not the sets.` — signed off, and actionable where "moved fast" is not. |
| `short rest` | Rule R1 | `restText()`, which counts the actual seconds. |
| A load, in a cue | — | Forbidden outright by §11.7. |

**Should the three slots then have no cue at all?** No — and this is the part worth stating. §4.13
would then hide the whole disclosure, taking the **figure** with it. A speed slot is `hpull`,
`squat` and `hpush`: three of the most useful figures in the set, on the day he is moving fastest.
And SP1 and R1 between them say nothing whatever about **position** — they are about load, bar speed
and rest. There is no competition once the cue stops talking about the load: two rules about one set
is only a problem when they are about the same thing.

The parent lift's cue is the right string because the movement is the same movement. Position does
not change at 67.5 kg. If anything it matters more: 6 × 3 at speed is where a torso angle drifts,
because he is not thinking about it.

```
d3a  ->  d1a's cue    Keep the torso at the same angle for every rep.
d4a  ->  d2a's cue    Drive the hips and shoulders up together.
d5a  ->  d1d's cue    Keep each wrist stacked under the dumbbell.
```

This follows `speedSource` (`{d3a:"d1a", d4a:"d2a", d5a:"d1d"}`) exactly, which is a happy accident
worth exploiting: **backend should copy the string, not reference it.** A cue is authored data. If a
plan edit changes `d1a`'s cue it should not silently rewrite `d3a`'s, and SP1's mapping exists for a
different purpose. Copy the four repeated strings by hand, all ten pairs.

---

## 10.5 The revert lines — one string each, no fresh judgement needed

Per §8.2 Rule A1 both slots are **two exercises, not two names for one**, and the choice is still
Chady's and still unasked. The cues above are written for the design's default. If he answers the
other way, exactly one string changes per slot and nothing else in this document moves:

| slot | If it becomes | Cue | Chars |
|---|---|---|---|
| `d2e` | Glute-ham raise | `Keep the body in one line from knee to shoulder.` | 47 |
| `d3d` | Shrug | `Keep the arms straight, no rolling the shoulders.` | 48 |

Both follow Q1 step 2 rather than step 1, because neither has a machine setup to get wrong: a GHR's
single failure is bending at the hips to cheat the knee flexion, and a shrug's is rolling the
shoulders and bending the elbows. Note the second-order consequence already recorded in §8.2 — a GHR
`d2e` also reverts `implement` to `bodyweight`, which changes Z2's load word and switches I2's
increment line off. **The cue is one string; the slot is not.**

`d1a` needs no revert line. A1 classed bent-over vs Pendlay as **one** exercise (class B), and
`Keep the torso at the same angle for every rep.` is correct for either — with the caveat that a
Pendlay row's torso angle is set from a dead stop each rep, which makes the cue easier to obey, not
different.

---

## 10.6 Where the honest answer needs to see him lift

Five. In each case the cue I have written is defensible without watching him, because it falls back
to Q1 step 1 (a setup fact that is true for anyone) or to the most common error across lifters
generally. What I cannot know is whether it is **his** most common error, which is what a cue is
supposed to be.

1. **`d1d` / `d5a` flat DB press.** I chose the wrist over the elbow path. Wrist collapse is the
   more common DB-press fault and the more expensive one, but if his elbows flare to 90° the cue is
   solving the wrong problem. `[Opinion]`. One filmed set answers it.
2. **`d5d` incline cable fly.** I do not know his setup — an incline bench between two low pulleys
   and a standing high-to-low fly are different movements sharing a name, and the setup
   non-negotiable differs (pulley height vs bench angle). I kept the elbow-angle cue because it is
   true in both. **This is also the one cue whose content §11.5 makes the figure draw** ("elbow angle
   unchanged"); I accepted it because a 5° elbow change is not drawable at 64 px, so the redundancy
   is nominal. Weakest of the 42 and the first I would revisit.
3. **`d1e` weighted dip.** Shoulder position at the bottom is the cue I would give most people. The
   competing candidate is depth, and which one he needs depends entirely on his shoulder mobility —
   which is a thing to look at, not infer. `[Opinion]`.
4. **`d2e` / `d3d`.** Not a cue problem. Two unanswered programme questions with cues attached.
5. **`d2b` / `d4b` hack squat.** Foot placement is machine-specific; some hack squats have a fixed
   platform where the cue is unactionable. `[Likely]` it applies to his.

**Not in scope, and stated plainly because §11.7's forbidden list makes it a live risk:** none of
the 42 cues says anything about pain, and none should. Three of the strings I struck were drifting
toward it (`Slight forward lean for chest, upright for triceps.` invites him to pick a variation
based on how a joint feels; `Don't let the lower back round off the pad.` survives only because it
is stated as a position and makes no claim about consequences). If a movement hurts, that is Rule
S1's territory and a person's, not a cue's. A cue must never become the place the app hedges.

---

## 10.7 Found while in here — three figures mapped to the wrong exercise

Not mine to fix and not blocking the cues, but it changes what a cue has to carry, so it belongs to
whoever draws the fifteen. §11.5 says "The map is correct and is kept". **In three places it is not.**

| slot | Mapped to | What the figure will show | Problem |
|---|---|---|---|
| `d3c` Seated cable row | `hpull` | A hinged-over torso with a barbell | He sits upright at a machine. Fails §11.8(1) — a person who knows the movement will not name it |
| `d4c` Leg press | `squat` | A standing figure with a bar on its back | It is not a squat pattern in any drawable sense: different ground reference, different body orientation. §11.2(1) makes the ground reference the thing that makes a pattern legible |
| `d3d` if it becomes a shrug | `hpull` | A row | Different movement entirely — scapular elevation drawn as horizontal pulling |

`d1c`/`d3b` rack chin drawn as a `vpull` and `d5c` machine chest press drawn as an `hpush` are
**acceptable** — same body orientation, same joint action, same ground reference class. The three
above are not. Recommendation: either add two patterns (`seatrow`, `legpress`) or accept that those
slots ship cue-only, which §4.13 already handles cleanly. **A missing figure is a smaller loss than
a wrong one** is §11.8's own rule, and it applies here.

---

## 10.8 Verdict

**Sign off with changes**, listed in §10.2: 32 amendments and 2 new strings. The 8 kept in substance
are `d1f`, `d3f`, `d4c`, `d5d`, `d5g`, `d5j` and, by inheritance, `d2g`'s bounce clause and `d5b`'s
bench angle.

Three of the amendments are not stylistic and would have been defects on the phone:

- **`d4d` `These should burn.`** — an assessment the app is not entitled to make, that instructs
  nothing, and that a lifter can chase with load.
- **`d1d` `dumbbells stacked over the wrists`** — the instruction is backwards.
- **The three speed cues** — a percentage of a "top set", which is the exact wording audit §7 struck
  as wrong, printed beside the engine that computes the right number in kilograms.

The rest is the same defect thirty times: a cue that says three things says none of them, and a cue
that repeats the drawing next to it is a blank line with words on it.

**Nothing here touches `logic.js`, `docs/backlog.md`, `docs/decisions.md`, `index.html` or
`tests.html`.** Backend transcribes §10.2 into `PHAT_PLAN`'s `cue` fields; the two `N` rows are new
keys on `d2e` and `d3d`. QA's assertion is mechanical and worth pinning, because it is the only part
of a cue a test can check: **every slot in `PHAT_PLAN` has a `cue`; every cue is <= 90 characters;
no cue contains `!`, a digit other than `d5b`'s `30–35`, `%`, `kg`, `rep range`, or the substring
`if it hurts`.** The `d5b` exemption is deliberate and is the only one.

---

# 12. Overnight rulings — 2026-09-11 (WO-005)

Three questions accumulated while the rebuild ran. All three are copy or mapping questions; none
changes a load, a rep range, a rest period or a calorie number, and nothing here touches an engine.

**Why §12 and not §11.** Every line below cites `wo-004-screens.md` §11.2 / §11.5 / §11.8. Two live
"§11"s in one conversation is a transcription hazard of exactly the kind that produced §12.2, so the
number is skipped deliberately. In this section a bare `§11.x` always means the **screens spec**.

## 12.0 Rulings at a glance

| # | Question | Ruling |
|---|---|---|
| 1 | `d5b` — §10.1 prose vs §10.2 table | **The table is correct.** `Set the bench to 30–35°, no steeper.` The prose was a paraphrase. §10.1 **corrected in place** today; see §12.2. |
| 2 | `d5c` machine chest press on `hpush` | **Drop to cue-only.** Fails Rule F1.1 and F1.2. This reverses my own §10.7 line calling it acceptable, and I say why. |
| 2 | `d2b` / `d4b` hack squat on `squat` | **Keep.** Feet on fixed ground, load on the shoulders, hips and knees closing, body descending. Apparatus only. |
| 2 | `d4g` seated leg curl on `legcurl` | **Drop to cue-only.** Fails F1.1 and F1.2 — the arrow points the wrong way in the frame. |
| 2 | `d2g` / `d4h` / `d4i` calf raises on `calf` | **Keep all three.** The block under the ball of the foot is the ground reference and the load path is vertical in every one. `d4h` is the boundary case and passes only because its cue names the hip bend. |
| 3 | `S1_LINES` | **Confirmed: exactly two strings, in order, both mine** (audit §10). Three things that must NOT be folded into it, listed in §12.4 — one of which is already marked wrongly in `logic.js`. |

---

## 12.1 Scope, and what I deliberately did not answer

Written while he was asleep, so the bar for "answer it anyway" is higher than usual. Everything below
is decidable from `docs/context/handoff-brief.md`, `docs/coach-audit.md` or this file. Two things
adjacent to these questions are **left open on purpose**, and neither blocks anything tonight:

- **`B-65` / `d3d`'s name and the `d2e` alternate.** Still Chady's, still unasked. §12.3 gives the
  mechanical consequence for the figure in each direction so nobody has to come back to me.
- **`B-45`, `fail → deload → fail`.** Unchanged and still deliberately deferred. §12.4 says why again,
  since the `S1_LINES` question walks right past it.

Nothing below touches `index.html`, `logic.js`, `tests.html`, `sw.js` or any other document. The two
implementation consequences — two `PAT` keys and one stale code comment — are specified here for their
owners, not made here.

---

## 12.2 `d5b` — the table is correct, the prose was the paraphrase

**The shipped string is right. Nothing about the app's behaviour needs to change.** `[Certain]`

Three references existed, and they were 2 : 1 for the table:

| Where | String | |
|---|---|---|
| §10.1, Output copy block | `Set the bench to 30-35 degrees, no steeper.` | ASCII hyphen, the word "degrees" |
| **§10.2, `d5b` row** | **`Set the bench to 30–35°, no steeper.`** | en dash U+2013, degree sign U+00B0 |
| §10.8, the QA assertion | *"a digit other than `d5b`'s `30–35`"* | en dash |

**Four pieces of evidence, any one of which settles it.** `[Certain]` on all four — these are checkable
facts about the file, not judgements.

1. **The table's own character count proves which string it was counting.** §10.2 states `36`.
   `Set the bench to 30–35°, no steeper.` is 36 characters. The prose form is 42. A count that matches
   the table and not the prose is the authored artifact.
2. **§10.2 carries a transcription note written for that exact string** — *"`d5b` contains an en dash
   (U+2013) and a degree sign (U+00B0)"*. Nobody writes a transcription note for a paraphrase.
3. **§10.8's QA assertion whitelists the en-dash form.** The prose form contains `30-35` with an ASCII
   hyphen and would trip the whitelist it is supposed to be exempt from — i.e. the prose version cannot
   pass the test §10.8 specifies.
4. **It already shipped, and correctly.** `logic.js:1637` reads `cue: "Set the bench to 30–35°, no
   steeper."`. `decisions.md` (2026-09-10) records the call and asked for my confirmation. Confirmed.

**House style agrees, so this is not merely a coin-toss resolved by seniority.** `[Opinion]` The app
already writes ranges with an en dash everywhere else — `8–12`, `3–5`, `65–70%`, `0.2–0.3 kg` — so
`30–35°` is the form that matches every other range he reads. It is also six characters shorter, and
§11.7's budget is 90 characters on a 400 px screen at 200 % text.

**What to change, plainly: the prose. And it is done.** §10.1's Output copy block now carries the
table's string verbatim, with a bracketed note recording what it used to say. **The table was not
touched, `logic.js` was not touched, no test moves.** The permitted-content rule the prose was stating
is unchanged: a setup angle is not a load and is not a tempo, and `d5b` remains the only numeric
exemption in the 42.

**The general point, because it will happen again.** Rule text that quotes a copy string is a second
copy of that string, and a second copy drifts. The addendum's preamble already ranks a worked example
above a copy line (WO-003 Decision 5); extend it: **where prose and a copy table disagree, the table
governs, always.** Prose illustrates a rule; a table is the artifact that ships. Anyone transcribing
copy takes it from §10.2, never from §10.1.

---

## 12.3 Rule F1 — when a slot may share another exercise's movement figure

The rebuild asked for six slots. They need one rule, not six opinions, or the next plan edit reopens
all of them. The rule below is the rebuild's own ground-reference ruling, kept and made testable, plus
the two clauses that decide the cases the ground-reference test alone leaves ambiguous.

```
Rule: F1 — figure reuse across slots
Applies to:   the slot -> pattern map (`PAT`) for every slot in a plan document, all roles
              (power | hyp | speed). Session screen, MOVEMENT & CUE disclosure only. No engine
              reads the map, no advice depends on it, and no stored data references it.
Inputs:       the exercise; the pattern's authored START/FINISH poses and ground reference
              (§11.5); the slot's signed-off cue (§10.2). All static. No history, no minimum
              data, no clock.
Logic:        A slot may render a pattern authored for a DIFFERENT exercise only if all three
              hold. Fail any one and the slot renders CUE ONLY.

              F1.1  GROUND REFERENCE AND LOAD PATH.
                    The surface the body is fixed against, and the body's orientation to the
                    direction the load travels, are the same. The APPARATUS may change freely:
                    a barbell, a dumbbell, a pin stack, a plate-loaded sled and a cable are the
                    same figure, because none of them changes where the body is braced or which
                    way the resistance acts.
                    (This is the rebuild's rule, unchanged, and it is the one that does most of
                    the work. §11.2(1) already makes the ground reference the thing that renders
                    a pattern legible.)

              F1.2  THE ARROW READS CORRECTLY IN THE FRAME.
                    The working end travels in the same direction WITHIN THE FRAME, not merely
                    relative to the torso. An arrow that runs up the frame on a movement whose
                    working end travels down the frame fails, whatever the joint is doing.
                    (§11.8(3) — "cover the cue: the figure still answers which way am I
                    pushing" — is the only acceptance test the spec applies to the figure alone.
                    This clause is that test, stated so it can be checked from the pose data.)

              F1.3  THE CUE CORRECTS ANY POSITION THE FIGURE GETS WRONG — but only where the
                    lifter could actually adopt the drawn position.
                    Where the figure draws a body position the slot requires to be otherwise:
                      - if the apparatus makes the drawn position impossible, no correction is
                        needed. A figure cannot teach a position a machine physically prevents.
                      - if he could adopt the drawn position, the slot's own cue must name that
                        position and correct it. A figure the cue corrects is under-specified;
                        a figure nothing corrects is wrong.
                    CONSEQUENCE, and it must be written down next to the cue table: rewriting a
                    cue can break a figure mapping. TWO slots currently pass F1 only because of
                    their cue - `d5b` (the cue names the bench angle) and `d4h` (the cue names
                    the hip bend). Both are pinned as test assertions below.
Output copy:  none. F1 decides whether a figure renders, never what anything says. A slot that
              fails renders its cue alone - no box, no placeholder, no label (§4.13, §11.6
              "Fallback"). The cue is unaffected in every case; no cue is added, removed or
              reworded by this rule.
Not enough data: not applicable - F1 is a decision about authored data, not a measurement.
              The analogous state is "no pattern is authored for this movement", and the answer
              is the same as a failure: cue only. That is already §11.8's rule - a missing
              figure is a smaller loss than a wrong one.
```

### The six referred slots, one line each

**`d5c` Machine chest press on `hpush` — DROP TO CUE-ONLY.** `[Certain]`
A supine bench press figure on a seated machine press fails F1.1 (bench under the whole trunk versus a
vertical back pad; pressing up against gravity versus pressing forward against a stack) and F1.2 (the
arrow runs vertically in the frame; his hands travel horizontally), and it fails §11.8(2) outright —
copy that finish position and you are lying down. The tell is in the cue: `Set the seat so the handles
line up with mid-chest.` names a **seat** and **handles**, neither of which exists anywhere in the
`hpush` drawing. **The figure and the cue are describing two different machines.** The rebuild called
it the weakest of these and the rebuild is right.

**This reverses my own §10.7.** I wrote there that `d5c` on `hpush` was acceptable — *"same body
orientation, same joint action, same ground reference class."* The joint action clause was right and
the body-orientation clause was simply wrong: a seated press is upright and a bench press is supine.
I made that call against the old artwork and without a frame to look at. `[Certain]` that it was wrong;
§12.3 supersedes §10.7 on `d5c` and nothing else in §10.7 moves.

**`d2b` / `d4b` Hack squat on `squat` — KEEP.** `[Likely]`
The feet stay planted on a fixed platform, the load sits on the shoulders, both hips and knees close,
and the body descends: F1.1 and F1.2 both pass, and the only difference is a sled and a back pad —
apparatus. F1.3 does not bite, because he cannot adopt the drawn free-standing trunk inside the
machine. It will not mislead him about how to perform the lift; the one instruction the picture gives
that he might act on is depth, and depth is the same instruction on both.

**`d4g` Seated leg curl on `legcurl` (prone) — DROP TO CUE-ONLY.** `[Certain]`
Fails F1.1 (prone pad with the trunk horizontal and the hips extended, versus a seat with the hips
flexed about 90°) and fails F1.2 decisively: **the arrow points the wrong way.** The prone figure
draws the heel travelling up the frame; on a seated curl the heel travels down and back under the
seat. Cover the cue and the figure answers "which way am I pulling" with the opposite of the truth,
which is the one thing §11.8(3) exists to catch. And the cue, `Set the lap pad tight enough that the
hips cannot lift.`, names a lap pad the drawing does not contain, so F1.3 cannot rescue it either.
Note this is not a hypothetical confusion: `d4f` lying leg curl and `d4g` seated leg curl sit two
slots apart in the same session, and the hip angle is the entire reason the programme carries both.

**`d2g` / `d4i` Seated calf raise on `calf` — KEEP.** `[Likely]`
**BOUNDARY, and the one I spent longest on.** The block under the ball of the foot is the ground
reference and it is identical; the load travels vertically through the foot in both; the heel rises up
the frame in both. F1.1 and F1.2 pass. F1.3 is where it could have failed — the figure draws a
straight knee and the seated version is knee-flexed by definition — but **the thigh pad makes the drawn
position physically impossible to adopt**, so there is nothing to correct and no error to teach. What
he takes from the picture is "drive through the ball of the foot, heel high", which is correct for
both. Accepted cost, stated plainly: the figure carries no information about which calf raise this is.
The exercise **name** does that job, and §10.3 already ruled that variants of one pattern are not the
confusable pairs §11.8(5) is about — `d2g` and `d4i` already share one cue, on the same reasoning.

**`d4h` Donkey calf raise on `calf` — KEEP, and it is the weakest thing I am signing off tonight.**
`[Likely]`
Same ground reference, same vertical load path, same knee state (straight, which is correct here),
so F1.1 and F1.2 pass. It survives F1.3 **only** because its cue names the hip: `Keep the hips bent at
the same angle for every rep.` He could stand upright — the apparatus does not prevent it — so without
that clause the figure would be teaching the wrong trunk position and the slot would drop.
**Pin this to the cue.** If `d4h`'s cue is ever reworded so that it stops naming the hip bend, the
figure goes with it. That dependency is F1.3's consequence clause and this is its live example.

### One more in the same class, not referred, ruled so it is not re-raised

**`d1d` / `d5a` Flat DB press and `d5h` Close-grip bench on `hpush`, which draws a barbell — KEEP.**
`[Certain]` Supine on a bench, pressing vertically, weight descending: F1.1 and F1.2 pass and only the
implement differs, which F1.1 explicitly permits. `d5b` incline DB press likewise keeps it, via F1.3 —
the figure draws a flat bench, he can absolutely set it flat, and the cue corrects it by naming the
angle. That is the same dependency as `d4h`, and it is the second reason §12.2 matters: the cue that
saves `d5b`'s figure is the cue whose two versions disagreed.

### Contingency, if Chady answers B-65 or the `d2e` alternate the other way

`[Certain]` Mechanical, not a judgement, so it can be applied without coming back to me:

- **`d2e` becomes a glute-ham raise** → it loses the `legcurl` figure. On a GHR the heel is anchored
  and the **trunk** is the working end travelling up; on a prone curl the trunk is still and the heel
  travels. F1.2 fails. Cue-only.
- **`d3d` becomes a shrug** → it stays cue-only, which is what it already is. No change.

### What changes, exactly

Two keys are deleted from `PAT` in `index.html`. **Nothing else in the file, and nothing at all in
`logic.js`, `PHAT_PLAN` or the cue data.**

```
PAT: delete d5c, delete d4g.
Result: 36 of 42 slots render a figure; 6 render the cue alone.
The 6: d3d · d4c · d4g · d5c · d5d · d5j
       (d4g and d5c are new tonight; the other four were dropped with B-60/B-64.)
```

| Assertion for QA | |
|---|---|
| `PAT.d5c === undefined` and `PAT.d4g === undefined` | the drop happened |
| `hasFig("d5c") === false`, `hasFig("d4g") === false` | and `hasFig` agrees |
| `Object.keys(PAT).length === 36` | snapshot, and it moves only with a ruling |
| the six cue-only slots each still render their §10.2 cue, with **no** empty box and no placeholder | §4.13 — the drop must not take the cue with it |
| `hasFig("d2b") && hasFig("d4b") && hasFig("d2g") && hasFig("d4h") && hasFig("d4i") && hasFig("d5b")` | the six kept mappings, pinned so a future tidy-up does not quietly delete them too |
| `d4h`'s cue contains `hips bent` and `d5b`'s contains `30–35°` | **F1.3 dependencies.** These two assertions are the only reason those two figures ship. Name them in the test so a copy edit fails loudly instead of silently making a figure wrong |

`[Opinion]` I am not asking anyone to draw anything tonight. If the figure set is ever extended, the
cheapest additions by slots-per-pattern are a seated-calf pattern (would not change my ruling, since
the shared one already passes) and a seated leg curl (1 slot). Neither is worth an overnight. A
seated machine press is 1 slot and I would not draw it at all.

---

## 12.4 `S1_LINES` — confirmed for export, and three things that must stay out of it

**Exporting it is right.** `[Opinion]` Rule S1's copy is the most constrained text in the app — it is
the only place the app speaks near medical territory — and one named constant that the view and the
suite both read is how it stays verbatim. Approve.

### The exact set. Two strings, this order, nothing else. `[Certain]`

```
S1_LINES[0]  You logged pain on this. Not something this app can assess.
S1_LINES[1]  Holding the weight. If it is sharp, or it repeats, stop the exercise and see a physio or a doctor.
```

**Both are mine, both signed off, both unchanged since.** Source: `docs/coach-audit.md` §10, the
"Output copy (fixed string, no interpolation, no softening)" block, 2026-09-09. I have compared them
character for character against what `logic.js:4094-4097` already holds: **identical.** No line in
`S1_LINES` is anyone else's, and nothing in it is new tonight.

Byte notes for the export, so "verbatim" is checkable: ASCII only — no en dash, no curly apostrophe,
no degree sign. No leading or trailing space. `[0]` is two sentences, `[1]` is two sentences. They join
with a **single space** for `painState().text`, which is what is built today.

### Three things that must NOT be folded in

**1. `From your last session on this.` — mine, approved, but NOT S1 copy.** `[Certain]`
It is approved: addendum **§9.6**, 2026-09-10, *"approve the line and approve shipping it in its own
field"*. It is a **provenance label**, not part of the refusal, and §9.6 approved it **on the condition
that it stays in its own field and is never joined into the approved text** — which is exactly how
`S1_PROVENANCE` is built. Keep it a separate constant. It must not enter `S1_LINES`, must not enter
`.text`, and must not be announced as part of the notice.

> **Stale comment, for backend to fix when it next touches that block.** `logic.js:4098-4100` says
> *"UX spec 4.8, marked NEW and PENDING COACH REVIEW there"*. It is no longer pending — I approved it
> in §9.6 the same day. The comment is now the only thing in the tree still calling it unreviewed, and
> a "pending coach review" marker on approved copy is how approved copy gets held back or quietly
> dropped. `wo-004-screens.md:744` and `:1564` carry the same stale marker. Copy change: none. Comment
> only. **And §9.6's forward condition stands: when PE1 lands, that field's content becomes
> epoch-dependent** (`100 × 5, under the old 3 × 3–5. Pick a weight for 8–12.`), which is another
> reason it can never live inside `S1_LINES` — S1's copy is fixed and that field's is not.

**2. The S1a 21-day restatement — mine, correct as built, and a REPLACEMENT, not a member.**
`[Certain]` `logic.js:4177-4180` matches addendum §9.7 verbatim. But it *replaces* `out.lines`; it is
never rendered alongside them. If it were added to the exported constant, the likeliest implementation
error is rendering both — and the app would then tell him it is `Holding the weight` on an exercise he
has not logged for three weeks, which is a claim about a session that did not happen. Leave it inline
in `painState`. Do not export it as a third line of anything.

**3. Nothing else. There is no third line and I am not writing one.** `[Certain]`
Not a severity word, not a duration, not "ease off", not "try a lighter weight", not "consider a
deload", not "it may just be DOMS", and not a dismissal control. Audit §10's standing limit is
unchanged and §3's restatement of it holds: the app may say §10's fixed string, S2b's
`You logged pain in the last 7 days.`, and S1a's 21-day restatement. That is the whole of what this
app may say about pain. **B-45 stays deliberately open on the same ground** — `fail → deload → fail`
still has no sentence and still will not get one from me until there is real logged history.

### Assertions worth pinning

| | |
|---|---|
| `S1_LINES.length === 2` and both strings match §10 character for character | the export is the copy |
| `painState(...).text === S1_LINES.join(" ")` when `active && !stale` | one source, not two |
| `S1_LINES` cannot be mutated through the export | **this is the real hazard of exporting it.** A plain array on `window.PHAT` lets any caller `push` a line onto the app's medical copy from anywhere. `painState` already returns `.slice(0)`; the *export* needs the same protection — freeze it, or export a function returning a fresh copy. `[Certain]` on the hazard; `[Opinion]` that freezing is the cheaper of the two |
| `S1_LINES.join(" ")` contains none of: `deload`, `rest`, `lighter`, `stretch`, `probably`, `should be fine` | §10's prohibitions, as a test rather than a promise |
| the stale path's text is **not** in `S1_LINES` and never renders beside it | item 2 above |

---

## 12.5 Verdict

**Sign off with changes**, three of them, all small and all already specified above:

1. **§10.1's prose corrected in place** to the table's string. Done in this commit. No shipped string
   moves; the table was already right and `logic.js` already carries it.
2. **Two keys deleted from `PAT`** — `d5c` and `d4g`. Both fail §11.8's own acceptance tests, one of
   them by drawing the arrow backwards, and both keep their cue. The other four referred mappings are
   kept, two of them conditionally on their cue, and the condition is now written down and testable.
3. **`S1_LINES` confirmed as exactly two strings**, both mine, with the provenance label and the
   21-day restatement held deliberately outside it, and one stale `PENDING COACH REVIEW` comment to
   retire.

Nothing here changes a load, a rep, a rest period, a week gate or a calorie number, and no engine is
touched. **The one standing item is unchanged and I will keep saying it:** this is the fourth night of
work on the tool and the log is still empty. The measure of all of it is one logged Upper Power session
with a correct verdict under it.

---

# 13. Two advice questions from QA — 2026-09-11 (WO-005)

**Added 2026-09-11.** Answers the two items `qa-engineer` raised at commit `9564f88` and deliberately
refused to pin. Both were right to refuse: one is a load recommendation nobody had ruled on, the other
is a medical-adjacent word list that an engineer should not be extending on instinct.

Rule ids introduced here: **P1.2a** (the repeat target, amending audit §3 case 2) and **S1b** (the
pain word list, amending audit §10's `Inputs` line). Neither collides with anything above.

## 13.0 Rulings at a glance

| # | Question | Ruling |
|---|---|---|
| 1 | `100 / 100 / 120` → `Repeat 120 kg` | **Reject.** Two defects in one branch: the mismatch branch fires on the wrong condition, and it names the wrong load. Rule **P1.2a**. |
| 1 | What load does a mismatched session repeat | The **heaviest load held for at least half the prescribed sets, rounded up** — the upper median, not the max, not the min. `100/95/90` → **95 kg**. |
| 1 | Does the branch fire at all on `100/100/120` | **No.** A set ABOVE the working load is not a failed prescription. It evaluates as an ordinary session at 100 kg → **`Go to 102.5 kg next session.`** |
| 1 | `120/100/100` — a different training story? | **No. Same answer, deliberately.** The rule is direction-blind: ordering is not intent and the app must not infer it. |
| 1 | Power vs hypertrophy | **Differs, and it already does.** H1 has no mismatch branch and must not get one — unequal loads across hypertrophy sets are normal execution, not a failed prescription. |
| 1 | Barbell vs dumbbell | **No difference.** `implement` changes rendering and the I2 appendix, never which load is the working load. |
| 2 | The pain word list | **Reject the current list as under-triggering.** 8 stems → **21**. Rule **S1b**, with the full transcribable set and a named exclusion list. |
| 2 | Which words only show the notice | **None. There is no notice-only tier.** If a word is worth a line between sets it is worth holding the weight. |
| 2 | `sore` | **Rejected from the list entirely.** Not a trigger, not a notice. Frequency, not physiology — reasoning in 13.6. |
| 2 | `twinge`, `ache`, `niggle` | **Accepted, tier 1.** Suppress and notify. |
| 2 | Negation handling | **No.** The deliberate over-trigger stands. Dropping `sore` removes more false positives than any negation logic would. |
| 2 | B-45 | **Stays open.** Unchanged from §12.4. |

---

## 13.1 Rule P1.2a — the repeat target, and when the mismatch branch fires

**The current behaviour is wrong and I am rejecting it.** `logic.js:2629` prints
`Repeat " + loadWord(top, im)` where `top = maxW(C)`. It matches audit §3 case 2 — *"repeat at
max(weights in C)"* — so this is my error, not the engineer's. I wrote case 2 while looking at one
example, `100/100/95`, where the heaviest set and the load he was working at are the same number. They
are only the same number when the log descends. QA found the ascending case and the rule falls over:
`100/100/120` prescribes three sets at a weight he held once.

`[Certain]` that is the sentence B-08 was filed about, reintroduced through a different branch. B-08
was closed on `verdictFor`'s *increase* path and this is the *repeat* path, which is why the fix did
not catch it.

**Two things are wrong, not one.**

1. The branch names `max`. It should name the load he actually worked at.
2. The branch **fires on the wrong condition.** It triggers on any inequality. A set below the working
   load is a failed prescription; a set above it is not. Firing on both means a better session
   (`100/100/120` at 5/5/5) earns a worse instruction than the same session without the heavy set
   (`100/100/100` at 5/5/5 → `Go to 102.5 kg`). `[Certain]` an inversion where doing more returns less
   is the B-07 failure class — the app punishing the lifter for a good session — and it is the reason
   this is a reject rather than a one-token patch.

```
Rule: P1.2a — the repeat target and the mismatch trigger
Applies to:   k:"power" only. Session screen verdict. Amends audit §3 case 2.
              k:"hyp" unchanged (13.3). k:"speed" does not reach P1 at all.
Inputs:       C = the first ex.s completed sets (Rule Z1, sliced by Rule X1).
              No history. No minimum beyond P1's existing gate.
Minimum data: unchanged — C.length must equal ex.s, else no verdict at all.

Logic:        load    = min(w in C)                    // B-08's working load, unchanged
              k       = ceil(C.length / 2)             // "at least half, rounded up"
              R       = the k-th LARGEST w in C         // the repeat target
                        equivalently: the heaviest W such that at least k sets
                        in C were performed at a load >= W
              backoff = (R - load) > 0.01               // at least one set fell BELOW R
              mixed   = (max(w in C) - load) > 0.01     // loads are not all equal

              Case order, first match wins. Only case 2's TRIGGER and TARGET
              change; every other case is untouched.

              1. C[0].r < ex.lo        -> TOO HEAVY. Unchanged, still computed
                                          from C[0].w. Still beats case 2. (13.4)
              2. backoff               -> NOT MATCHED. Repeat at R.
              3. min(r in C) >= hi + 2 -> TOO LIGHT. G1 step off `load`.
              4. min(r in C) >= hi     -> ADD. load + inc.
              5. else                  -> HOLD at load.

              `equal` is retired as case 2's trigger. It is replaced by
              `backoff`, and by `mixed` where the COPY needs to stay truthful.

Output copy:  Case 2, no zero load in C:
                `Sets not matched: 100 / 95 / 90 kg. Repeat 95 kg until all 3 sets reach 5 reps.`
              Case 2, any zero load in C (Z2 delta 3 list form, unchanged):
                `Sets not matched: 2.5 kg / bodyweight. Repeat 2.5 kg until all 2 sets reach 10 reps.`
              The list is rendered in LOGGED ORDER, never sorted. It is a record
              of what happened; R is the instruction. Both are on screen and
              that is deliberate — he can see the 120 and see that the app saw it.

              Cases 3 and 4 when `mixed` is true — the load token gains ` or above`,
              and ONLY the token that makes a claim about every set:
                3, loaded : `7 reps at 100 kg or above on every set. Too light. Go to 105 kg.`
                3, zero   : `12 reps at bodyweight or above on every set. Too light. Add 2.5 kg.`
                4, loaded : `Top of range on all 3 sets. Go to 102.5 kg next session.`   (UNCHANGED —
                            the sentence claims reps, not load, and is already true)
                4, zero   : `Top of range on all 3 sets at bodyweight or above. Add 2.5 kg next session.`
                5         : `Stay at 100 kg until all 3 sets reach 5 reps.`              (UNCHANGED —
                            an instruction, not a claim about what happened)
              Rule ids do not move: P1.1, P1.2, P1.3, P1.4, P1.5 keep their
              meanings. `mixed` is a copy variant of the same case, not a new one.
Not enough data: unchanged. Below ex.s completed sets, nothing renders.
```

**Why the upper median and not something else.** `[Opinion]`, reasoned, and I will hold it.

- **Not `max`** — `[Certain]` it prescribes a load he held once. That is the whole of B-08.
- **Not `min`** — `[Certain]` it sends him backwards after a near miss. `100/100/95` → `Repeat 95`
  costs two sessions to get back to a weight he just did twice, and it contradicts the pinned copy in
  audit §3 example 2.
- **Not the first set's load** — `[Certain]` it gives the right answer on `100/100/120` and the B-08
  answer on `120/100/100`. Any rule that reads set order is inferring intent from a log that does not
  record intent.
- **The upper median** is the only one of the four that is a load he performed for the majority of the
  prescription, in both directions, with no tie-break case. `[Opinion]` the sentence behind it is one a
  lifter can reproduce in his head: *the weight you did most of your sets at.*

**Frequency check, so the complexity is justified.** `[Likely]` ascending logs are not exotic here:
eight slots are `db`, where the rack forces a jump and "the last set felt easy so I took the next
dumbbell up" is ordinary behaviour, and `d1b`/`d1c`/`d1e` are loaded from a belt where he grabs
whatever plate is to hand. This case will occur.

**The Z2 invariant survives, for a new reason — say this to QA explicitly.** §Z2 asserts *"the repeat
target in case 2 is max(weights in C) and can never be 0"*. The first half of that sentence is
**withdrawn**; the conclusion stands and the assertion may stay pinned. Under P1.2a, case 2 fires only
when `R > load`, and `load >= 0` by Z1, so `R > 0` always. `[Certain]` — arithmetic. The string `0 kg`
remains unreachable from every branch.

## 13.2 Worked examples — chosen to kill the wrong rules, not to pass

QA's objection to B-08's existing regression case is correct and is the point of this table: on
`100/100/95` the heaviest set and the working load are both 100, so the test passes under the broken
rule and the correct one. **Every row below distinguishes at least one wrong rule from the ruled one,
and rows 2 and 3 distinguish all of them.** Squat `d2a {s:3, lo:3, hi:5, k:"power", implement:"bb"}`
unless stated.

| # | Logged | today (`max`) | if `min` | if `C[0].w` | **RULED** |
|---|---|---|---|---|---|
| 1 | `100×5, 100×5, 95×5` | Repeat 100 | Repeat 95 | Repeat 100 | **Repeat 100** |
| 2 | `100×5, 95×5, 90×5` | Repeat 100 | Repeat 90 | Repeat 100 | **Repeat 95** |
| 3 | `100×5, 100×5, 120×5` | Repeat 120 | Repeat 100 | Repeat 100 | **Go to 102.5** |
| 4 | `120×5, 100×5, 100×5` | Repeat 120 | Repeat 100 | Repeat 120 | **Go to 102.5** |

1. **The B-08 regression, kept as-is.** `100×5, 100×5, 95×5` → desc `[100,100,95]`, k=2 → R=100,
   load=95, backoff → case 2 →
   `Sets not matched: 100 / 100 / 95 kg. Repeat 100 kg until all 3 sets reach 5 reps.`
   **Character-identical to audit §3 example 2.** Nothing pinned moves. It kills `min` and nothing else,
   which is exactly QA's complaint about it — keep it, but never cite it as evidence for the target.

2. **The discriminator. This is the test B-08 should have had.** `100×5, 95×5, 90×5` → desc
   `[100,95,90]`, k=2 → R=95, load=90, backoff → case 2 →
   `Sets not matched: 100 / 95 / 90 kg. Repeat 95 kg until all 3 sets reach 5 reps.`
   Max, median and min are three different numbers. Only the ruled rule produces 95.

3. **QA's case.** `100×5, 100×5, 120×5` → desc `[120,100,100]`, k=2 → R=100, load=100 →
   **backoff is false**, mixed is true, min rep 5 >= hi 5 → **case 4** →
   `Top of range on all 3 sets. Go to 102.5 kg next session.` plus no I2 appendix (`bb`).
   **Pin the negative too:** the strings `Repeat`, `120 kg` and `Sets not matched` must all be absent.
   A test that only asserts the positive will pass on a rule that prints `Repeat 100 kg`, which is the
   coincidence QA is trying to avoid.

4. **The inverse.** `120×5, 100×5, 100×5` → same R, same load, same output as 3:
   `Top of range on all 3 sets. Go to 102.5 kg next session.`
   Deliberate. `[Opinion]` he held 100 for all three sets at the top of the range and 120 for one; the
   prescription was met at 100 and the instruction is +2.5. The 120 is not thrown away — it is on the
   screen in his own log, and the app does not need a sentence about it.

5. **Boundary — upward outlier, reps short.** `100×5, 100×5, 120×4` → R=100, load=100, backoff false,
   min rep 4 < hi 5 → case 5 → `Stay at 100 kg until all 3 sets reach 5 reps.` One rep short is still
   one rep short, and the heavy set does not buy it (audit §3 example 3).

6. **Boundary — the two-set slot, where k=1 and R IS the max.** `d1c Rack chin {s:2, lo:6, hi:10}`,
   `5×8, 2.5×8` → desc `[5,2.5]`, k=ceil(2/2)=1 → R=5, load=2.5, backoff → case 2 →
   `Sets not matched: 5 / 2.5 kg. Repeat 5 kg until all 2 sets reach 10 reps.`
   `[Opinion]` on a two-set prescription one set is half of it, and repeating the heavier is the
   standard call. The rule agreeing with `max` here is a consequence, not an exception.

7. **Failing case — case 1 still beats case 2.** `120×2, 100×5, 100×5`, lo 3 → `C[0].r` 2 < 3 →
   `2 reps at 120 kg. Below the range. Drop to 115 kg next session.` Unchanged and deliberate (13.4).

8. **Zero load, and the invariant.** `d1b Weighted pull-up {s:3, lo:3, hi:5}`, `2.5×5, 0×5, 0×5` →
   desc `[2.5,0,0]`, k=2 → R=0, load=0 → **backoff false** → mixed → case 4, zero form →
   `Top of range on all 3 sets at bodyweight or above. Add 2.5 kg next session.` plus the I2 appendix.
   Case 2 cannot fire here, which is why R can never be 0. Assert `0 kg` absent.

9. **Zero load, backoff.** `2.5×8, 0×10` on a `{s:2, lo:6, hi:10}` bodyweight slot → k=1 → R=2.5,
   load=0, backoff → case 2 → `Sets not matched: 2.5 kg / bodyweight. Repeat 2.5 kg until all 2 sets
   reach 10 reps.` **Character-identical to Z2 example 5.** Nothing pinned moves.

10. **Mixed too-light.** `100×7, 100×7, 120×7` on 3–5 → R=100, load=100, backoff false, mixed, min rep
    7 >= hi+2 → case 3, G1 step `round2p5(100 × 0.025 × 2)` = 5 →
    `7 reps at 100 kg or above on every set. Too light. Go to 105 kg.`
    Without ` or above` the sentence claims he did every set at 100 kg and one of them was 120. Pin the
    variant; it is the only new string in this rule.

## 13.3 Does the answer change by role or by implement?

**By role — yes, and the difference is already in the code.** `[Certain]`

- **`k:"power"`** — straight sets at one load are the prescription. `3 × 3–5` means three sets at the
  same weight; a set below that weight is a failed prescription and P1 case 2 exists to say so.
- **`k:"hyp"`** — there is no mismatch branch and **there must not be one.** On `d3h Lateral raise
  3 × 15–20` or `d5j Rope pressdown`, dropping the load on the last set is ordinary execution of a
  high-rep set, not a failure, and H1's tonnage comparison (and Z3's rep comparison at zero load)
  already accounts for it without naming a load. H1's one load-naming branch, case 2, computes off
  `minW(C)` — the conservative end — and is correct as built. **No change to H1. Sign off.**
- **`k:"speed"`** — SP1 owns the number; P1 is never consulted. No change. Rule S2a stands.

**By implement — no.** `[Certain]` the identity of the working load is a property of what he lifted,
not of what it was attached to. `implement` decides the per-DB suffix (I1), the load word (Z2) and the
increment appendix (I2), and nothing else. Noted for completeness: a mismatched `db` session is
*likelier* to mean "the 22.5s were taken" than "I failed", but the instruction — repeat the load you
did most of your sets at — is the same one either way, so nothing turns on the distinction.

## 13.4 One thing I looked at and am deliberately NOT changing

`120×2, 100×5, 100×5` gives `Drop to 115 kg` — 5% off a set he **failed**, when the same session
contains two completed sets at 100. That is the same shape of complaint as B-08 and I considered
capping case 1's drop at R.

**Rejected.** `[Opinion]`, and the deciding case is the audit's own: `100×2, 90×4, 90×5` → the cap
would print `Drop to 90 kg` and the correct coaching answer is plainly **95** — he missed 100 by one
rep and got 5 reps at 90, so the load is between them. A cap that is wrong on the pinned example is
wrong. Case 1 is also already the conservative direction: it can only ever name a load **below** one he
attempted today, and if it is still too heavy it fires again next session and comes down again.
Unchanged, pinned example unchanged, and flagged here so nobody re-raises it as a bug.

`[Opinion]` minor, take it or leave it: case 2 returns `t:"down"`. A mismatched session is neither
progress nor regression, and `t:""` would be more honest. It is a tone token, it changes no number, and
I am not asking for it tonight.

---

## 13.5 Rule S1b — the pain word list

QA is right and the miss is mine. `right elbow twinge on set 2` is a person telling the app something
about a joint, and the app answers `Go to 102.5 kg`. The list in audit §10 has eight stems and I wrote
them in one pass without asking what a lifter actually types.

```
Rule: S1b — the pain trigger list
Applies to:   every role, every screen with a note. Amends the `Inputs` line of
              audit §10 (Rule S1). Everything else in §10 is unchanged: the
              suppression scope, the two fixed lines, the clearing rule (S1a),
              the per-exercise reach, the prohibitions.
Inputs:       one note string. No history, no minimum data.
Logic:        a match on ANY word below -> the full Rule S1 response:
                - suppress every verdict that increases load (P1 cases 3 and 4,
                  H1 case 2) on THAT exercise; show the hold copy instead
                - render S1_LINES verbatim on that exercise's card
                - the note enters painWindow, so Rule S2b suppresses V1's
                  weekly accessory offer for 7 days, and S2c appends its one
                  factual line to a stall report for 21 days
              There is no second tier. A word is either all of the above or
              nothing at all.
Output copy:  unchanged. S1_LINES, verbatim, per §12.4. No new string.
Not enough data: not applicable — the rule is the refusal.
```

### The complete set — 21 entries, transcribable

| # | Word / stem | Status | Conf |
|---|---|---|---|
| 1 | `pain` `painful` `painfully` | existing | `[Certain]` |
| 2 | `hurt` `hurts` `hurting` | existing | `[Certain]` |
| 3 | `injur*` | existing | `[Certain]` |
| 4 | `sharp` | existing | `[Certain]` |
| 5 | `pinch*` | existing | `[Certain]` |
| 6 | `tweak*` | existing | `[Certain]` |
| 7 | `strain*` | existing | `[Certain]` |
| 8 | `sprain*` | **new** | `[Certain]` |
| 9 | `twinge` `twinges` `twinged` | **new** | `[Certain]` |
| 10 | `ache` `aches` `ached` `aching` `achy` `achey` | **new** | `[Likely]` |
| 11 | `niggl*` | **new** | `[Certain]` |
| 12 | `numb` `numbness` | **new** | `[Certain]` |
| 13 | `tingl*` | **new** | `[Certain]` |
| 14 | `swollen` `swelling` | **new** | `[Certain]` |
| 15 | `impinge*` | **new** | `[Certain]` |
| 16 | `inflam*` | **new** | `[Certain]` |
| 17 | `stabbing` `stabbed` | **new** | `[Certain]` |
| 18 | `tear` `tears` `tore` `torn` | **new** | `[Certain]` |
| 19 | `spasm` `spasms` | **new** | `[Likely]` |
| 20 | `pulled` | **new** | `[Likely]` — program-specific, see below |
| 21 | `gave way` `gives way` `giving way` | **new** | `[Opinion]` |

One regex, one place, case-insensitive, word-bounded:

```
/\b(?:pain|painful|painfully|hurt|hurts|hurting|injur\w*|sharp|pinch\w*|tweak\w*|strain\w*|sprain\w*|twinge[sd]?|ach(?:e|es|ed|ing|y|ey)|niggl\w*|numb|numbness|tingl\w*|swollen|swelling|impinge\w*|inflam\w*|stabbing|stabbed|tears?|tore|torn|spasms?|pulled|g(?:ave|ives|iving) way)\b/i
```

**Five stem hazards. Every one of them is a word that will appear in a real note, and every one is the
mistake an engineer makes while "tidying" this list.** `[Certain]` on all five.

| Tempting | Breaks on | Use instead |
|---|---|---|
| `pain\w*` | `painting` | `pain\|painful\|painfully` (the existing `\b`-bounded form already handles this — §`logic.js:2126` says so, keep the comment) |
| `numb\w*` | **`number`** — "rep number", "number of sets" | `numb\|numbness` |
| `ach\w*` | `achieve` | `ach(?:e\|es\|ed\|ing\|y\|ey)` |
| `stab\w*` | **`stability`, `stabilise`** | `stabbing\|stabbed` |
| `tear\w*` | **`teardrop`** (the VMO) | `tears?\|tore\|torn` |

**`pulled` is the one entry with a program-specific justification.** `[Likely]` In most training logs
`pulled` is a false-positive machine — "pulled 200 today". **This program contains no conventional
deadlift**: the pulling slots are `d1a` row, `d2d` SLDL and `d4e` RDL, and nobody writes "pulled 140 on
rows". So the word is nearly free here and it catches `pulled my hamstring`, which is a thing a person
types and a thing worth stopping for. **If a conventional deadlift ever enters the plan, revisit this
one entry.** Bare `pull` and `pulling` stay out — those are the movement pattern and half the program.

### Which words suppress, and which only show the notice: **none only show the notice**

QA asked me to draw this line rather than let an engineer draw it. I am drawing it in a place QA did not
offer: **there is no notice-only tier, and there should not be one.** `[Opinion]`, held.

A notice with no change to the prescription is the app naming a symptom and then telling him to add
2.5 kg anyway — it comments on his body and acts as if it had not. And `S1_LINES[1]` is a *referral*:
`stop the exercise and see a physio or a doctor` is the wrong sentence to attach to normal training
soreness, and attaching it there is how the line stops being read on the day it matters. If a word is
worth a line between sets it is worth holding the weight for one session. If it is not worth holding
the weight it is not worth a line.

### `sore`, `ache`, and why they are split

**`ache` is in. `sore` is out.** They are the same kind of word and I am treating them differently on
**frequency, not physiology** — say that plainly rather than dressing it as a clinical distinction.
`[Opinion]` on the line; `[Certain]` on the two facts under it.

`[Certain]` delayed-onset soreness is the expected result of a five-day hypertrophy split in a surplus.
It is not a symptom. A trigger that fires most weeks is not a signal, it is a tax — and it does three
things, all bad: it holds loads on exercises that are progressing fine, it suppresses V1's accessory
offer more or less permanently through `painWindow` (Rule S2b, 7-day window, **any** exercise), and it
teaches him to stop writing notes, which blinds the other 20 words. `[Certain]` that last cost is the
one that matters: the note field is the only recovery input the app has.

`ache` does not carry that frequency. `[Likely]` a lifter writes "legs sore" every week and "elbow
aches" when something is wrong. The app cannot parse anatomy and must not try — deciding that
"quad ache" is benign and "elbow ache" is not is assessment, and §10 forbids it. So `ache` takes the
over-trigger, accepts the occasional held session, and `sore` is not in the list at all.

### Considered and excluded, with the reason. Do not add these back without a ruling

| Word | Why not | Conf |
|---|---|---|
| `sore` `soreness` `DOMS` | above — frequency, and the referral line is wrong copy for DOMS | `[Opinion]` |
| `stiff` `tight` `tightness` | normal, and **`tight` is a coaching cue** — "stay tight", "tight brace" | `[Certain]` |
| `cramp*` | benign and common in calf and hamstring work at 15–20 reps | `[Likely]` |
| `burn` `burning` | the burn is a deliberate product of the 15–20 rep slots | `[Certain]` |
| `pump` `fatigue` `tired` `drained` `beat up` | recovery words, not symptoms. They are also **not** deload inputs — D1 triggers off performance (§8), never off a mood word | `[Certain]` |
| `pop` `popped` `popping` | **"pop the hips" is a standard cue**, and painless joint noise is not a symptom | `[Certain]` |
| `click*` `crunch*` `crepitus` | painless joint noise is not clinically meaningful, and `crunch` is an exercise. **This is the one place the over-trigger bias is deliberately overridden by a fact** | `[Certain]` |
| `shooting` | **"shooting for 5 reps"** | `[Certain]` |
| `unstable` `instability` | describes equipment as often as a joint, and lives one letter from `stability` | `[Opinion]` |
| `locked` `locking` | **`lockout`** | `[Certain]` |
| `catch` `catching` | a lift term and a breath term | `[Likely]` |
| `grind*` | a lift term — the speed-work copy itself says `never grinding` | `[Certain]` |
| `flare` `flared` | **elbow flare is a bench form cue** | `[Certain]` |
| `bruise*` | bar bruising on RDLs and hack squats is cosmetic | `[Likely]` |
| `weird` `odd` `off` | too vague to defend in either direction | `[Opinion]` |
| `physio` `doctor` `MRI` `cortisone` | real signals, but indirect, and the symptom word is almost always in the same note. Keep this list to words about the body | `[Opinion]` |

### Negation: **no handling. The over-trigger stands.** `[Certain]` on the reasoning

Audit §10 accepts `no pain today` as a false positive by name and §12.4 did not disturb it. That still
holds, and three things make it the right call:

1. `[Certain]` negation detection on free text fails **silently in the dangerous direction**. The note
   `no pain in the knee but the shoulder is sharp` is one clause of negation and one real report, and
   any scan cheap enough to ship would suppress the whole note.
2. `[Certain]` the cost matrix is unchanged: a false positive costs one held session plus two lines of
   text; a false negative costs a load increase onto something that hurts.
3. `[Likely]` **dropping `sore` does more for false positives than negation logic would.** `not sore`
   and `less sore than last week` were the most likely benign notes in the whole list, and they no
   longer match anything. `less achy than last week` still fires. I accept that one.

**Instruction to whoever implements it: do not extend this into a parser.** No negation, no proximity,
no body-part table, no severity grading. One regex, one boolean.

### Consequences of widening the list, all intended

- `painWindow` widens, so V1's accessory offer is suppressed by more notes. **Correct** — that is
  S2b's whole purpose and it is refusal, not treatment.
- S2c's appended line on a stall report fires more often. **Correct.**
- SP1 is still untouched (S2a). **Correct.**
- **`S1_LINES` does not change.** `[Opinion]`, and I hold it: `You logged pain on this.` under a note
  that said "twinge" is the app using one word as the category name for the class, and the second line
  already carries the conditional (`If it is sharp, or it repeats`) that covers the mild end. Churning
  the one piece of near-medical copy in the app to accommodate a word-list change is the wrong trade.
  §12.4's two strings stand, character for character. The same applies to S2b's
  `You logged pain in the last 7 days.`

### Worked examples

1. **QA's case.** `d1g Cambered bar curl`, note `right elbow twinge on set 2`, sets `30×5, 30×5, 30×5`
   → P1 case 4 would print `Go to 32.5 kg next session.` → suppressed →
   `Stay at 30 kg until all 3 sets reach 5 reps.` plus `S1_LINES` verbatim. Today: no notice, `Go to
   32.5 kg`. This is the regression test.
2. `d3c Seated cable row`, note `shoulder aches after set 3` → matches (`aches`) → H1 case 2 downgrades,
   notice shows, `painWindow` active for 7 days so V1's offer does not render this week.
3. **Boundary — the stem hazards, as a single test with five assertions, all expecting NO match.**
   `rep number 3 felt fast` · `achieve 5 reps` · `stability work after` · `teardrop finally showing` ·
   `painting the garage tomorrow`. Every one must return `false`. **This is the half of the suite that
   never gets written and it is the half that catches the next well-meaning `\w*`.**
4. **Failing case — the deliberate false positive, unchanged.** `no pain today, felt strong` → matches
   → notice shows, load held. Accepted cost, pinned since audit §10. Do not "fix" it.
5. **The deliberate silence.** `legs sore from Tuesday` → **no match.** Normal verdict, no notice, V1's
   offer renders. Assert the absence, not just the presence — this is the ruling that is most likely to
   be undone by someone reading QA's original report and adding `sore`.
6. `pulled my hamstring on the last rep` → matches (`pulled`) → full S1 response.
   `pulled 140 for a triple` → also matches. Accepted, and 13.5's program-specific note says why.

---

## 13.6 What this changes, by work item

| Item | Change |
|---|---|
| `logic.js` `verdictPower` | Case 2's trigger `!equal` → `backoff`; its target `maxW(C)` → `R`. New helper (suggested name `repeatLoad(C)`, not `top`, not `mode` — see CLAUDE.md §7 on `top`). Cases 3 and 4 gain the ` or above` variant on `mixed`. No other branch moves. |
| `logic.js` `PAIN_RE` | Replaced per 13.5. **Recommend** exporting the source list as a frozen `PHAT.PAIN_WORDS` compiled into the regex, so the suite pins the list rather than a regex literal — same argument as `S1_LINES` in §12.4. `[Opinion]` |
| `tests.html` | P1.2a examples 1–10; the four-column mutant table in 13.2 as explicit negative assertions (`Repeat 120 kg` absent on rows 3 and 4). S1b: one test per new word, the five-assertion stem-hazard test in 13.5 example 3, and the `sore` **non**-trigger test. |
| `docs/coach-audit.md` §3 case 2 | Superseded by 13.1. The file is not edited (§0 convention); this section is the amendment. |
| `docs/coach-audit.md` §10 `Inputs` | Superseded by 13.5. Everything else in §10 unchanged. |
| Addendum §Z2 | The invariant sentence "the repeat target in case 2 is max(weights in C)" is **withdrawn**; its conclusion (never 0) stands, for the reason in 13.1. |
| Addendum §Z2 example 5, §3 example 2 | **Unchanged, character for character.** Neither pinned string moves under P1.2a. |
| B-08 | Reopen or file a sibling — the repeat path was never covered. PM's call which. |
| B-45 | **Stays open.** Unchanged from §12.4: no sentence for `fail → deload → fail` until there is real logged history. |

## 13.7 Verdict

**Reject both, with the replacement rules above.**

Question 1 was two defects, not one, and the second is the worse of them: the branch fires on a
condition that turns a good session into a worse instruction. Question 2 was a list I wrote too fast —
eight words where twenty-one are needed, and the one QA typed by hand is the one that proves it.

Two things I will not do. I will not build negation handling, and I will not add `sore`: one is a
parser in the advice layer and the other is a trigger that fires most weeks and would end up training
him out of writing notes at all. Both are refusals, and refusing is the app's correct move near this
subject.

**And the standing item, for the fifth night: the log is still empty.** Every rule in this section is
about which number to print under a set he has not yet performed. One logged Upper Power session would
tell us more about P1 than this document does.

---

# 14. The calorie hold's copy — 2026-09-11 (WO-005)

**Added 2026-09-11.** Answers the sign-off `ux-designer` requested in `docs/specs/wo-004-screens.md`
§7.5.2 and §15 #12, and closes out the whole of `wo-003-train-weight.md` §3.5, which has been marked
*pending coach sign-off* since it was written and shipped that way in W11 tonight.

`ux-designer` was right to refuse. The hold note is the app's account of **why a calorie instruction
is being withheld**, printed under a calorie band. That is advice about the diet protocol wearing a
state-disclosure's clothes, and it is mine.

Rule id introduced here: **W1h** — the hold disclosure. It amends nothing in audit §2; it specifies a
field that did not exist when §2 was written.

## 14.0 Rulings at a glance

| # | Question | Ruling |
|---|---|---|
| 1 | `You changed calories {ago}. Hold ends {date}.` | **Sign off, unchanged.** Not one character moves. |
| 1a | Drop state 7's instruction clause? | **Correct, and for a stronger reason than UX gave.** In all three states where the note can render, `adv.text` one rank above already contains the literal clause `Change nothing.` The instruction is not missing; restating it in different words would be the second voice. Pinned as an invariant (14.2). |
| 1b | Does it read as permission to change? | **`[Likely]` no, and the residual risk is correctly placed.** The hold is his own receipt, not a prescription. What he may do on the date is decided by the band sentence he reads at rank 2, and on that date the card still says `Change nothing.` if the rate has not moved. |
| 1c | `Hold ends {date}` or a countdown in days? | **The date. `[Certain]`** — it matches `holdUntil` exactly, it matches state 7's own `Hold until 15 Sep`, it is checkable against a calendar, and it does not change while he looks at it. A day count is a number that ticks (§4.7) and is wrong for ten minutes either side of midnight. |
| 2 | `This starts a 7-day hold. No new calorie advice until {date}.` | **Reject.** The promise is false in bands 2, 3 and 4. Replacement in 14.3: **`This starts a 7-day hold. Change nothing until {date}.`** |
| 3 | The remaining seven §3.5 strings | **Sign off all seven, unchanged** (14.4). One of the eight is replaced; the other seven ship as written. |
| 4 | Where `holdNote` is built | **In `logic.js`. Confirmed.** A view assembling it is wrong, and is wrong in the specific way B-06 and B-51 are wrong (14.5). |
| — | A gap found while in here | The set control renders only in tone `act`, so a calorie change he makes **on his own initiative** can never be declared. Named in 14.6. **Not changed tonight** — it needs UX and a work order. |

---

## 14.1 The sentence — sign off, unchanged

```
You changed calories {ago}. Hold ends {date}.
→ You changed calories 3 days ago. Hold ends 15 Sep.
```

**Signed off as written. `[Certain]` on the reasoning below; the copy itself is a `[Opinion]` call I
am making and will hold.**

**(a) Disclosing without restating the instruction is the right call — and the reason is mechanical,
not stylistic.** UX argued from voice: an instruction under `Change nothing. Recheck in 7 days.` puts
two voices on one card. True, but that argument alone would not survive a coach's objection that he is
being left uninstructed. He is not, and here is the proof. The note is reachable **only** in states
`above`, `on-target` and `below` — `logic.js` resolves a live hold in any of the other three bands to
`cooldown`, which renders state 7's own sentence instead. All three of those band sentences contain
the literal clause `Change nothing.`:

```
above      +0.41 kg per week. Above target, inside the margin. Change nothing. Recheck in 7 days.
on-target  +0.25 kg per week. On target. Change nothing.
below      +0.14 kg per week. Below target but inside weekly noise. Change nothing. Recheck in 7 days.
```

So the instruction *not to change calories* is already on the card, one rank louder than the note,
every single time the note appears. Adding `Hold until 15 Sep before changing again.` beneath it would
not add an instruction; it would add a **second, differently-worded copy of the instruction already
there**, and two imperatives that differ in wording invite the reading that they differ in meaning.
That is the failure to avoid.

**This is a dependency, so it is pinned as a test, not left as a coincidence** — see the invariant in
14.2. If a future edit ever removes `Change nothing.` from one of those three sentences, W1h must come
back to me before it ships, because at that moment the card really would be withholding an instruction.

**(b) The permission-reading risk, stated honestly and accepted.** `Hold ends 15 Sep` can be read as
*on 15 Sep I may change something*. `[Likely]` that reading is harmless here, for two reasons:

- The hold is a receipt for something **he** did, not a prescription the app issued. It expires; it
  does not mature into an entitlement.
- On 15 Sep the decision is made by the band sentence at rank 2, not by the note at rank 4. If the
  rate is still in band 2/3/4 the card still reads `Change nothing.` The note cannot outrank it, which
  is precisely why §7.5.1 forbids it its own kicker, its own rule and `--bone`.

I considered and rejected three "safer" wordings. `Calorie advice resumes 15 Sep` is false for the
same reason the confirmation body is false (advice never stopped). `New calorie advice is on hold
until 15 Sep` is accurate but re-asserts a rule at footnote rank and is longer than the line it
replaces. Saying nothing at all is worse than either: see (d).

**(c) Date, not countdown. `[Certain]`.** `Hold ends 15 Sep` is the same token, from the same field
(`holdUntil`), as the `15 Sep` in state 7's sentence and the `{date}` in the confirmation he tapped
through. Three places, one date, no arithmetic for him to do. `4 days left` is a different number in
each of those places, changes every midnight, and is the kind of figure a lifter checks daily instead
of weighing himself daily — which is the one behaviour this whole tab exists to produce.

**One boundary that matters and reads correctly under this wording:** the hold is **not** active on the
date printed. `active = gap < 7`, so a stamp on 8 Sep gives `holdUntil` 15 Sep and the hold is already
gone when 15 Sep arrives. `Hold ends 15 Sep` is therefore exact — 15 Sep is the first free day, and the
note does not render on it. Worked example 4 in 14.7 pins the absence.

**(d) The justification I want on the record, because it decides the rank.** In bands 2, 3 and 4
nothing is being withheld *at this moment* — the card is character-for-character identical with the
hold on or off. So the note is not an advisory. **It is the clear control's context.** A bare
`I did not change anything` button sitting under `+0.25 kg per week. On target. Change nothing.` is
incoherent — it reads as an answer to the band. The note is what makes that button legible, which is
exactly why it is footnote rank, why `aria-describedby` points the control at it (§7.5.1 A11y), and
why it must never grow a kcal figure or a rate.

---

## 14.2 Rule W1h — the hold disclosure

```
Rule: W1h — the hold note
Applies to:   the Weight tab only. No exercise role, no session screen.
              Rule W1 states `above` / `on-target` / `below` only.
Inputs:       PHAT.calorieAdvice(entries, todayStr, calChangedAt) and nothing
              else: state, holdUntil, daysAgo. No new stored field, no new
              minimum, no new window.
Minimum data: none beyond W1's own. holdUntil is null in `empty`,
              `need-history`, `thin-window-b` and `thin-window-a` because the
              engine returns before the cooldown test. The note is therefore
              UNREACHABLE in every not-enough-data state and must stay
              unreachable: a screen that cannot compute a rate does not get to
              start explaining why it is suppressing one.
Logic:        holdNote is non-empty  IFF  holdUntil !== null AND state !== "cooldown"
              "" in every other case, including cooldown.
              Exactly one hold disclosure on screen whenever holdUntil is set:
                state === "cooldown"  -> adv.text IS the disclosure, holdNote ""
                any band              -> holdNote, below the sub-line
              The note never renders without the clear control beside it, and
              the clear control never renders without either the note or state
              7's sentence. A disclosure with no exit is the defect this rule
              exists to close.
Output copy:  `You changed calories {ago}. Hold ends {date}.`
              {ago}  = the existing agoWord(daysAgo): `today` | `1 day ago` | `{n} days ago`
              {date} = dayMon(holdUntil): `15 Sep`. Never Intl (B-44).
              Carries NO imperative, NO kcal figure, NO rate, NO day count.
              Rank 4, the sub-line's token and size, never bolder, never --bone.
Not enough data: "" and the slot renders nothing. There is no thin-data variant
              of this string, because holdUntil cannot be set in a thin-data state.
Rationale:    the hold suppresses the next add-or-cut instruction. Suppression
              the user cannot see, cannot date and cannot undo is the app lying
              by omission. One sentence that says who did what and when, at the
              rank of a footnote, with its own undo directly beneath it.
```

**Two invariants for `qa-engineer`, both cheap and both load-bearing.**

1. `holdNote !== ""` implies `holdUntil !== null`; `state === "cooldown"` implies `holdNote === ""`.
   (UX already specified these; I am confirming them as coaching requirements, not just contracts.)
2. **The instruction guard.** For every input that yields `holdNote !== ""`, assert
   `adv.text.indexOf("Change nothing.") !== -1`. This is the test that makes 14.1(a) safe. If it ever
   goes red, the fix is **not** to relax the assertion — it is to send W1h back to `strength-coach`,
   because the card has stopped instructing him and the note was written on the assumption it does not
   have to.

**The opening clause is one string in one place.** `You changed calories {ago}` appears in state 7's
sentence and in the note, and they must be byte-identical for the same `daysAgo` — that identity is
the whole reason UX opened with state 7's clause. Build both from one internal helper (suggested
`changedClause(daysAgo)`; naming is `backend-engineer`'s). Two literals that happen to match today is
a divergence waiting for the next edit.

---

## 14.3 The confirmation body — reject, and the replacement

**Current, already shipped:**

```
This starts a 7-day hold. No new calorie advice until {date}.
```

**Reject. `[Certain]` it is false**, and UX was right to refuse to reuse it and right not to invent
the replacement. During a hold, calorie advice renders in full in bands 2, 3 and 4 — the rate, the
band sentence, the sub-line, all of it. What the hold suppresses is a **new add-or-cut instruction**,
and only that. A false promise in a modal is cheap to fix today and expensive later: it is the
sentence he will remember when the app shows him a calorie decision during a week he was told there
would be none, and the thing he loses at that moment is trust in the number.

**Replacement, signed off:**

```
This starts a 7-day hold. Change nothing until {date}.
```

**Why this one.**

- It makes **no claim about what the app will render**, so the imprecision is not tightened, it is
  removed. There is nothing left to be wrong about.
- `Change nothing.` is the app's existing vocabulary for exactly this instruction — it is the clause
  in bands 2, 3 and 4 and in the on-target sentence. One idea, one wording, everywhere.
- It states the **coaching** content, which the old line never did. The hold is not an app feature; it
  is the seven days you must leave a 200 kcal change alone before you are allowed to read the scale
  and judge it. The modal is the right place for that instruction, unlike the card footnote, because
  this is the moment of commitment.
- `7-day` and the date both stay: the length is what he is consenting to, the date is what he will
  check against, and `hold` is the word the note and state 7 both reuse.

**Why seven days is the right number, since I am now putting an imperative behind it. `[Certain]`
given W1's windows.** The rate is `mean(window B) − mean(window A)` over `[today−6..today]` versus
`[today−13..today−7]`. Exactly seven days after a change, window B is entirely post-change and window
A is entirely pre-change — that is the cleanest comparison the data can produce, and the first day on
which the change is readable at all. Shorter would be reading noise. **Do not shorten it, and do not
let a UI convenience shorten it.** I am not lengthening it either: the brief's protocol is the
protocol, and 7 days is the first honest read.

**This changes a string he has already seen.** It shipped in W11 tonight. The cost is one string and
nothing else: the modal is transient, no stored field depends on it, no migration, no test fixture
outside `tests.html`. `[Likely]` he has never actually seen it — the modal renders only in tone `act`,
which needs ≥ 5 dated bodyweight entries in each of two windows, and the log is empty. Replace it.

---

## 14.4 The rest of §3.5 — seven strings, all signed off

| Element | String | Ruling |
|---|---|---|
| Control | `I changed my calories today` | **Sign off.** First person is correct here and nowhere else in the app: this is him making a claim to the app, not the app instructing him. `today` is load-bearing — it is what `setCalChanged` stamps. |
| Confirmation headline | `Changed your calories today?` | **Sign off.** Asks the one question the stamp answers. See the note below on a change made yesterday. |
| Confirmation body | `This starts a 7-day hold. No new calorie advice until {date}.` | **REJECT — replaced in 14.3.** |
| Confirm | `Yes, changed today` | **Sign off.** Repeats the claim being recorded on the button that records it. Correct for the destructive direction. |
| Cancel | `Not yet` | **Sign off**, and it is better than `Cancel`. The instruction above is still outstanding when he taps it, and `Not yet` says so without nagging. `Cancel` would imply the decision goes away. |
| Toast | `Recorded.` | **Sign off.** Flat, factual, no praise. The app must not congratulate a man for eating more; that is the failure mode this voice exists to prevent. |
| Clear control | `I did not change anything` | **Sign off**, in both contexts. Under state 7 it answers the sentence above it; under a band it reads as the retraction of the claim the hold note just restated — which is exactly what it is. |
| Clear toast | `Hold cleared.` | **Sign off.** Names the thing removed, in the word the note and the modal both use. |

**Two calls inside that table that are mine, not UX's, and I want them on the record.**

**The "changed yesterday" case.** He changed calories yesterday, opens the app today and taps
`I changed my calories today`. The stamp lands on today, so the hold runs one day long. `[Certain]`
that error is in the safe direction — a hold one day too long costs one day of a suppressed
instruction and nothing else, while a hold one day too short lets a second 200 kcal change stack
inside the measurement window. **Do not add a date picker to this control.** It would turn a
two-tap acknowledgement into a form, to buy an accuracy the protocol does not need.

**One tap to clear, no confirmation.** `[Likely]` correct, and it is a coaching call as much as a UX
one, so I am confirming it rather than deferring. The mis-tap costs a restored instruction he may then
act on — worst case a second +200 kcal stacked on a real change, ≈ +400 kcal/day for a few days, which
next week's rate catches and band 1 corrects. The opposite mis-tap — a hold stuck on with no cheap way
out — costs a week of silence on the one screen whose job is to answer *am I eating right*. Cheap
direction is the safe direction. Confirmed.

---

## 14.5 `holdNote` is built in `logic.js`. Confirmed, and a view doing it would be wrong

**Confirmed. `[Certain]`.** `PHAT.calorieAdvice` returns `holdNote`, non-empty exactly per 14.2, and
the view prints it or prints nothing. Three reasons, in order of weight:

1. **The sentence interpolates two coach-owned helpers**, `agoWord` and `dayMon`. A view that
   re-derives `3 days ago` from a stored date is a **second implementation of a clause that already
   exists in state 7's sentence**, and the two can disagree — most obviously at `daysAgo === 0` and at
   a future stamp, where `agoWord` has deliberate behaviour that nobody re-implementing it by
   instinct would reproduce.
2. **The one-disclosure invariant is only testable in the engine.** `holdNote !== "" XOR state ===
   "cooldown"` is an assertion `qa-engineer` can write against a pure function from `file://`. The same
   rule expressed as a condition inside a template string is a thing you verify by reading it.
3. **It is the B-06 failure class, one layer up.** B-06 and B-51 are both a *view* computing its own
   version of a coach-owned number. This app's whole advice architecture is the correction to that:
   no sentence that makes a claim about the diet or the training is assembled in a view. The hold note
   makes a claim about the diet protocol — that is precisely why §7.5.2 escalated it to me rather than
   shipping it.

**One engine edge, already correct, that must be pinned rather than fixed.** A stamp dated in the
future keeps the hold active (`logic.js` says why: clock skew must not open a window for a second
change). `agoWord` then returns `today` for a negative gap, so the note reads
`You changed calories today. Hold ends 25 Sep.` for a stamp of 18 Sep. **That is the behaviour I
want** — it is identical to what state 7 already prints in the same situation, and the alternative
("in 7 days") is a sentence about the future in a field that describes the past. Worked example 7.

---

## 14.6 One gap found while in here — named, not fixed

**The set control renders only in tone `act`, so a calorie change he makes on his own initiative can
never be declared.** He eats 400 more for a week over a holiday, or decides himself to add food while
the card says `+0.25 kg per week. On target. Change nothing.` — there is no control to stamp it, so
the app carries no record, and when the rate swings it may instruct a second change on top of the
first, inside the same noise window. That is the exact outcome the hold exists to prevent, reachable
through the one door the hold does not cover.

**I am not changing it tonight.** The fix is a control in every band, which contradicts §3.5's own
reasoning (*a control that is always present is a control that gets tapped absently*), needs UX, and
is new capability rather than a defect fix. `[Guessing]` on frequency — I have no data, because there
is no data. **For `project-manager`: this is a backlog candidate, P2, and it should not be opened
until there is real bodyweight history to say whether it ever happens.**

---

## 14.7 Worked examples

Bodyweight sufficient for a rate in every row unless stated. `today` = 11 Sep 2026.

| # | Stamp | Rate / state | `holdNote` | What renders |
|---|---|---|---|---|
| 1 | 11 Sep (today) | `+0.41` → `above` | `You changed calories today. Hold ends 18 Sep.` | band · sub-line · note · clear control. **No set control** |
| 2 | 8 Sep | `+0.25` → `on-target` | `You changed calories 3 days ago. Hold ends 15 Sep.` | as above. Card is identical to the no-hold card except for rows 4 and 5 |
| 3 | **Boundary, last day of the hold.** 5 Sep | `+0.14` → `below` | `You changed calories 6 days ago. Hold ends 12 Sep.` | as above. `gap 6 < 7`, still active |
| 4 | **Boundary, first free day.** 4 Sep | `+0.14` → `below` | `""` | band · sub-line and **nothing else**. `gap 7`, hold inactive, `holdUntil` null, clear control gone. **Assert the absence** — the note must not render on the date it printed yesterday |
| 5 | **Failing case.** 8 Sep | `+0.04` → would be `flat` (tone `act`) | `""` | state 7: `You changed calories 3 days ago. Hold until 15 Sep before changing again.` · sub-line · clear control. **Two disclosures on this card is the bug W1h exists to prevent** — assert `holdNote === ""` |
| 6 | **Failing case.** 8 Sep, 8 entries over 24 days | `thin-window-a` | `""` | `Not enough daily weights. 2 of those 7 days logged; this needs 5.` No rate, **no note, no clear control**, and the hold is unreachable until the windows fill. Deliberate |
| 7 | **Edge, pin it.** 18 Sep (future) | `+0.25` → `on-target` | `You changed calories today. Hold ends 25 Sep.` | as row 2. Matches state 7's existing behaviour on the same input. Do not "fix" |
| 8 | none | `+0.41` → `above` | `""` | band · sub-line. No note, no control, no set control |

---

## 14.8 What this changes, by work item

| Item | Change |
|---|---|
| `logic.js` `calorieAdvice` | Returns `holdNote`, per Rule W1h (14.2). Built from the existing `agoWord` and `dayMon`; no new helper beyond the shared `changedClause(daysAgo)` that state 7's sentence should also be built from. No band, window, threshold or existing string moves. |
| `index.html` — Weight tab | Renders `adv.holdNote` when non-empty, at rank 4, sub-line token and size. The clear control keys off `adv.holdUntil !== null` — that half is a defect fix and ships regardless of this sign-off. **The view assembles no part of the sentence.** |
| `index.html` — confirmation modal | Body string replaced: `This starts a 7-day hold. No new calorie advice until {date}.` → **`This starts a 7-day hold. Change nothing until {date}.`** One string. Nothing else in the modal moves. |
| `tests.html` | The eight rows of 14.7, with rows 4, 5, 6 and 8 as explicit **absence** assertions. Both invariants from 14.2, including the `Change nothing.` instruction guard across every input that yields a non-empty note. One test pinning the opening clause byte-identical between `holdNote` and state 7's `text` at the same `daysAgo`. |
| `wo-004-screens.md` §7.5.2 | Satisfied. The sentence is signed off unchanged; the slot may render. |
| `wo-004-screens.md` §15 #12 | Closed by 14.3. The imprecision was real; the replacement removes the claim rather than qualifying it. |
| `wo-003-train-weight.md` §3.5 | The eight-string table is signed off, one string replaced. The *pending coach sign-off* marker comes off. That file is not edited (§0 convention); this section is the amendment. |
| Backlog | New P2 candidate from 14.6 — no way to declare a self-initiated calorie change. **Do not open it until there is bodyweight history.** |

## 14.9 Verdict

**Sign off the hold note unchanged. Reject the confirmation body and replace it. Sign off the other
seven §3.5 strings as written.**

The sentence UX wrote is right, and it is right for a better reason than the one given: the
instruction he needs is already on the card, one rank louder, in every state where the note can
appear — and that is now a test rather than a coincidence. The confirmation body was the only genuine
error in the set, it was found by the person who declined to paper over it, and the correct repair is
to delete the claim about what the app will render rather than to qualify it. `Change nothing until
{date}.` says the true thing and says the coaching thing in the same six words.

**And the standing item, for the sixth night: the log is still empty, and so, as far as I can tell, is
the bodyweight table.** Every string ruled on above renders only after ten dated weigh-ins across two
specific weeks. The cheapest way to make this section matter is to stand on the scale tomorrow
morning.
