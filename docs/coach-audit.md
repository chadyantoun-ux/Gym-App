# Coaching audit — `index.html` against `docs/context/handoff-brief.md`

Owner: `strength-coach`. Written 2026-09-09. Source of truth is the handoff brief; where I depart from
it I say so and say why.

**Verdict on the app as it stands: reject.** The programme data is correct. The advice built on top of
it is not. Two of the wrong outputs — the calorie band and the stall warning — will fire at a lifter who
is doing exactly what the app told him to do, and one of them tells him to eat less while bulking.

Confidence tags: `[Certain]` hard evidence · `[Likely]` strong inference · `[Guessing]` gap-filling ·
`[Convention]` a defensible standard practice, not physiology · `[Opinion]` my coaching preference.

---

## 0. Summary of rulings

| Item | Ruling |
|---|---|
| `PROGRAM` vs the brief's tables | **Pass.** Sets, rep ranges, exercise order and every ✂ flag match exactly. Two naming defects only (§1). |
| Calorie bands in `vWeight()` | **Reject.** Contradicts the brief in both directions. Rule W1. |
| B-06 seven-day average | **Confirm.** Tighten to Rule W1. |
| B-07 stall detector | **Amend.** My earlier "compares against session #1" complaint was **wrong** — that is the brief's protocol. The weight-only complaint stands. Rule ST1. |
| B-08 progression off top set | **Confirm.** Rule P1. |
| B-09 rest timer | **Confirm.** Numbers in Rule R1. |
| B-12 speed-work percentage | **Confirm.** Compute it. Rule SP1. |
| B-18 deload | **Amend.** No scheduled deload. Autoregulated trigger plus a cycle display. Rule D1. |
| "Full volume" checkbox | **Reject.** Not a boolean. Rule V1. |
| Hypertrophy verdict (not in backlog) | **New defect.** Volume-only, and it fires mid-set. Rule H1. |
| Pain in notes (not in backlog) | **New defect.** Collected, ignored. Rule S1. |

---

## 1. `PROGRAM` vs the brief — line-by-line result

I checked all 42 exercise slots across the five days for name, set count, rep range and ✂ flag.

**Day 1 Upper power, Day 2 Lower power, Day 4 Back & shoulders, Day 5 Lower hypertrophy, Day 6 Chest &
arms: all match.** Every `s`, `lo`, `hi` is correct. Every `cut:1` is on the right exercise and only on
the ✂ exercises — d1c Rack chin, d2c Leg extension, d3d DB row/shrug, d3g Upright row, d4c Leg press,
d4g Seated leg curl, d5d Incline cable fly, d5g Spider curl, d5j Rope pressdown. Nine ✂ in the brief,
nine `cut:1` in the code. No spurious flags. Whoever transcribed this did it properly.

Three defects, all naming, all real:

**D-1 (P2) — `d1a` is named "Bent-over row"; the brief says "Bent-over or Pendlay row".**
The brief's gotcha about exact-name matching in the spreadsheet applies here too: if he does Pendlay rows
and the app calls it bent-over row, the two records diverge. Rename to `Bent-over / Pendlay row`.

**D-2 (P2) — `KEY_LIFTS` mislabels two of the four lifts.**
`{id:"d1d", n:"Bench"}` is a **flat dumbbell press**, and `{id:"d2d", n:"Deadlift"}` is a **stiff-leg
deadlift**. The mapping is correct — those are the right two lifts for the brief's week-6 test, because
the programme contains no barbell bench on a power day and no conventional deadlift at all. The *labels*
are wrong and will make him compare a DB press trend against a barbell bench number he remembers.
Rename to `DB press` and `SLDL`.

**D-3 (P1) — the app never states whether dumbbell loads are logged per dumbbell or as a pair.**
This is not cosmetic. It silently breaks three things: the speed-work computation (Rule SP1), plate math
(B-10), and any comparison of "Bench" on the trend chart. Decide once, display it: **log dumbbell weight
per dumbbell** `[Convention]` — it is what every commercial logger does and what the rack is labelled
with. Show it in the target line: `3 × 3–5 · per DB`.

Not a defect but worth noting: every Day 1 and Day 2 exercise is tagged `k:"power"`, including the 6–10
rep assistance work. That is faithful to the brief, which states its execution rule per *day*, not per
exercise. I am not asking for a re-tag. Rule P1 and Rule R1 handle the difference where it matters.

---

## 2. Rule W1 — bodyweight trend and the calorie decision

**Supersedes the logic in `vWeight()` entirely. Closes B-06 and the calorie-band contradiction.**

The current code is wrong in four separate ways:

```js
const l7=b.slice(-7), p7=b.slice(-14,-7);          // last 7 ENTRIES, not 7 days
if(b.length>=2){ ... }                              // advises from as few as 8 entries
if(d>=.2&&d<=.35){...} else if(d<.2) add 200; else cut 200;
```
1. `slice(-7)` is entries, not days — eight entries over five weeks produce a confident "weekly change".
2. It cuts calories in the **+0.35 to +0.5 kg/week** band. The brief says do nothing there. On a bulk,
   telling a lifter gaining 0.4 kg/week to eat less is a direct hit to the goal.
3. The add-trigger is `< 0.2`, not "flat". A measured +0.15 kg/week is inside the noise of two weekly
   averages `[Certain]` — you cannot distinguish it from +0.25.
4. `d < .2` catches weight *loss* and prints "Gaining too slowly". He is not gaining at all.

Plus the panel prints "Target: 0.2–0.3 kg per week" directly under logic that treats 0.34 as on target.

```
Rule: W1 — weekly bodyweight rate and calorie adjustment
Applies to:   the Weight tab only. No training role.
Inputs:       bodyweight entries {date (local calendar date), kg}.
              Window B = the 7 local dates [today-6 .. today].
              Window A = the 7 local dates [today-13 .. today-7].
              Minimum: >= 5 distinct dated entries in A AND >= 5 in B.
              Plus: last acknowledged calorie change must be >= 7 days ago.
Logic:        rate = mean(B) - mean(A)          // kg per week
              rate >  +0.50            -> CUT 200 kcal from training days
              +0.30 < rate <= +0.50    -> no change (above target, inside margin)
              +0.20 <= rate <= +0.30   -> no change (on target)
              +0.10 <= rate <  +0.20   -> no change (below target, inside noise)
              rate <  +0.10            -> ADD 200 kcal to training days
              Cooldown: if a change was made < 7 days ago, suppress any new
              change and show the cooldown copy instead.
```

**Output copy** (exact strings):

- Cut: `Gaining too fast at +0.62 kg per week. Cut 200 kcal from training days.`
- On target: `+0.25 kg per week. On target. Change nothing.`
- Above target, inside margin: `+0.41 kg per week. Above target, inside the margin. Change nothing. Recheck in 7 days.`
- Below target, inside noise: `+0.14 kg per week. Below target but inside weekly noise. Change nothing. Recheck in 7 days.`
- Flat: `Flat at +0.04 kg per week. Add 200 kcal to your training days.`
- Losing (rate < -0.10, same action, different copy): `Down 0.35 kg this week. You are not bulking. Add 200 kcal to your training days.`
- Cooldown: `You changed calories 3 days ago. Hold until 16 Sep before changing again.`
- Sub-line under all of the above, replacing the current one: `Target: +0.2 to +0.3 kg per week. Averages over 14 days.`

**Not enough data.** Show the average only when window B has ≥5 entries, labelled with the count. Show no
rate and no advice at all otherwise.

- Fewer than 14 days of history: `Weigh daily. 6 more days before this becomes a calorie decision.`
- 14 days of history but a thin window: `Not enough daily weights. 3 of the last 7 days logged; this needs 5.`
- No entries at all: keep the current empty state.
- The "7-day average" row's label becomes `7-day average (6 of 7 days)`.

**Worked examples**

1. Daily weights for 14 days, mean A 85.00, mean B 85.25. rate +0.25. → `+0.25 kg per week. On target. Change nothing.` Green.
2. **Boundary.** rate exactly +0.50. Not `> 0.50`. → `+0.50 kg per week. Above target, inside the margin. Change nothing. Recheck in 7 days.` At +0.51 it flips to cut.
3. **Boundary.** rate exactly +0.20 → on target. rate exactly +0.10 → below target, no change. rate +0.09 → add 200.
4. **The failing case that ships today.** 8 entries spread over 24 days. Current app: `l7` spans 20 days,
   `p7` is one entry, prints a "weekly change" of +1.2 kg and says **cut 200 kcal**. Under W1: window A
   holds 2 entries → below the minimum → `Not enough daily weights. 2 of those 7 days logged; this needs 5.`
   No number, no advice.
5. Daily for 14 days, A 85.4, B 85.4. rate 0.00 → `Flat at +0.00 kg per week. Add 200 kcal to your training days.` Today's app says the same thing here, by accident, via the `d<.2` branch.
6. rate +0.34. Today's app: **cut 200 kcal**. Under W1: `+0.34 kg per week. Above target, inside the margin. Change nothing.` This is the contradiction in its purest form.

**Rationale.** The brief's protocol is weigh daily, average the week, run 14 days, then decide — and its
only two triggers are *flat* and *above +0.5*. `[Certain]` day-to-day bodyweight noise on a 180 cm male is
±0.5–1.0 kg from water, sodium, gut content and glycogen, so a week-over-week difference of 0.15 kg is
measurement error, not a metabolic signal. Acting on it means chasing noise with a 200 kcal lever, which
oscillates the diet and destroys the very trend you are trying to read. Silence is the correct output
below 14 days; a wrong "cut 200" on a bulk costs him the surplus he is training for.

---

## 3. Rule P1 — working load on power days (B-08: **confirm**)

`verdictFor`'s power branch:

```js
const w=topSet(sets);
if(d.length>=ex.s && d.every(s=>+s.r>=ex.hi))
  return {t:"up", x:`Top of range on every set. Go ${r1(w+2.5)} kg next session.`};
return {t:"", x:`Stay at ${w} kg until all ${ex.s} sets reach ${ex.hi} reps.`};
```

`topSet` is `Math.max` of the weights. 100/100/95 for 5/5/5 therefore recommends **102.5 kg**, off a
weight he did not complete for all three sets. The hold branch is wrong the same way: it says "stay at
100" when the honest instruction is "you did not get 100 for three sets — repeat it".

```
Rule: P1 — power-day progression
Applies to:   k:"power" (all Day 1 and Day 2 exercises), Session screen verdict.
Inputs:       ex {s, lo, hi, inc}; the session's completed sets in logged order
              (completed = w > 0 AND r > 0). inc defaults to 2.5 kg.
              C = the first `ex.s` completed sets. Extra sets beyond `ex.s` are ignored.
              Minimum: C.length == ex.s. Below that, no verdict at all.
Logic:        equal  = max(weights in C) - min(weights in C) <= 0.01
              load   = min(weights in C)      // the weight he actually held for every set
              1. If C[0].r < ex.lo                  -> TOO HEAVY. next = round2.5(C[0].w * 0.95)
              2. Else if not equal                  -> NOT MATCHED. repeat at max(weights in C)
              3. Else if every r >= ex.hi + 2       -> TOO LIGHT. next = load + max(inc, round2.5(load*0.05))
              4. Else if every r >= ex.hi           -> ADD. next = load + inc
              5. Else                               -> HOLD at load
              Override: if this exercise's note matches Rule S1, cases 3 and 4 downgrade to HOLD.
              round2.5(x) = nearest 2.5 kg, ties downward.
```

**Output copy**

- Add: `Top of range on all 3 sets. Go to 102.5 kg next session.`
- Hold: `Stay at 100 kg until all 3 sets reach 5 reps.` *(unchanged — it was already right)*
- Not matched: `Sets not matched: 100 / 100 / 95 kg. Repeat 100 kg until all 3 sets reach 5 reps.`
- Too heavy: `2 reps at 100 kg. Below the range. Drop to 95 kg next session.`
- Too light: `7 reps at 100 kg on every set. Too light. Go to 105 kg.`
- Increment unavailable (dumbbells, machines) — appended when `inc` cannot be made: `If 2.5 kg is not available, add reps up to 7 first, then jump.`

**Not enough data.** Fewer than `ex.s` completed sets → render nothing in the verdict slot. Do not show
"stay at X" off one set: mid-workout that reads as an instruction about the set he is about to do.

**Worked examples**

1. Squat 3 × 3–5, logged 100×5, 100×5, 100×5. equal, all ≥ 5 → `Top of range on all 3 sets. Go to 102.5 kg next session.`
2. **The B-08 case.** 100×5, 100×5, 95×5. Not equal → `Sets not matched: 100 / 100 / 95 kg. Repeat 100 kg until all 3 sets reach 5 reps.` Today's app says go to 102.5 kg.
3. **Boundary.** 100×5, 100×5, 100×4. equal, one set below `hi` → `Stay at 100 kg until all 3 sets reach 5 reps.` One rep short is not a rounding error; it is the difference between a completed prescription and an incomplete one.
4. **Failing case.** 100×2, 90×4, 90×5. C[0].r = 2 < lo = 3 → `2 reps at 100 kg. Below the range. Drop to 95 kg next session.` Case 1 wins over case 2 deliberately: the mismatch is a *symptom* of the load being wrong, and the useful instruction is about the load.
5. Stiff-leg deadlift 3 × 5–8, logged 120×8, 120×8, 120×8 → add → 122.5 kg. Logged 120×10 ×3 (hi+2) → `10 reps at 120 kg on every set. Too light. Go to 126 kg.` → round2.5 → **125 kg**.
6. Two sets logged of a 3-set exercise, mid-workout → no verdict.

**Rationale.** `[Certain]` the working load is the weight you completed for the whole prescription; a
weight you hit once and missed twice is not a training load, it is a single. The brief's rule is "add
2.5 kg when **all sets** hit the top of the range", and `topSet` is a direct contradiction of the word
"all". Using `min` is also the conservative failure mode: it can only ever recommend a lighter next
session than `max` would.

---

## 4. Rule ST1 — stall detection (B-07: **amend — I was partly wrong**)

**Correcting my earlier assessment.** I wrote in B-07 that comparing against the all-time first session
is a bug. Reading the brief, it is not. Section 4, "the week 6 test", is literally: *"Are the top sets on
row, bench, squat, deadlift higher than week 1?"* The app implements the agreed protocol, on the agreed
four lifts, at the agreed week. **That half of B-07 is withdrawn.** CLAUDE.md §7 already says so and it
is right.

**What still stands, precisely.** The detector reads `topSet` — weight only:

```js
const hits=S.sessions.filter(s=>s.entries[l.id]).map(s=>topSet(s.entries[l.id].sets));
if(hits.length>=3 && Math.max(...hits)<=hits[0]) stalled.push(l.n);
```

PHAT and Rule P1 both require him to fill the rep range *before* the weight moves. So there is a real
state — same bar weight, more reps — that is unambiguous progress and that this code scores as zero.
Concretely: week 1 row 100 kg × 3/3/3, week 6 row 100 kg × 5/5/5. He has added six reps at his top load
and is one session from a 2.5 kg jump. `topSet` is 100 in both, `Math.max(...hits) <= hits[0]` is true,
and the app tells him **the sets aren't close enough to failure or he isn't eating enough**. That is the
app punishing him for obeying it.

Second flaw, unrelated to reps: the test never re-baselines. At week 30 it is still comparing to session
one, so once he has ever added weight the check is dead and can never fire again.

Fix both by changing the *measure* and the *window*, keeping the brief's four lifts and its week-6 timing.

```
Rule: ST1 — stall detection
Applies to:   the four key lifts only (d1a Row, d1d DB press, d2a Squat, d2d SLDL).
              Trend screen. Never applied to hypertrophy or 15-20 rep work.
Inputs:       logged sessions containing those exercise ids.
              e1RM per set = w * (1 + r/30)   [Epley]. Only sets with r <= 8 count;
              above 8 reps the estimate is not trustworthy for these lifts.
              e(session) = max e1RM across that session's completed sets for the lift.
              Recent block = sessions dated [today-20 .. today]      (3 weeks)
              Prior  block = sessions dated [today-41 .. today-21]   (3 weeks)
              Minimum: trainingWeeks >= 6, AND >= 2 sessions of that lift in each block.
Logic:        progress if max(e over Recent) >= max(e over Prior) * 1.025
              stalled  otherwise.
              Report per lift. Lifts failing the minimum are excluded and named separately.
```

`trainingWeeks` = count of calendar weeks since the first logged session that contain **≥3 logged
sessions**. Not `weeksIn()`. `[Likely]` a week with one session is not a week of training, and gating a
"you are not progressing" warning on calendar time he did not train is how you get a wrong accusation.

**Output copy.** Keep the brief's wording — it is his agreed protocol and it is good:

```
Week 7 and no progress on Row, Squat.
This is the check we agreed on. The split isn't the problem and neither is the diet.
Either the sets aren't close enough to failure, or you aren't eating enough.
Fix one, not both, and give it three weeks.
```

**Not enough data:**
- Before week 6: render nothing. No placeholder, no "on track" reassurance.
- Week 6+, a lift below the session minimum: `Not enough sessions on SLDL to judge. Log it weekly.`
- Week 6+, all four below the minimum: `Six weeks in but the log is too thin to test. Log all four lifts weekly.`
- Week 6+, all tested lifts progressing: say nothing. The chart is the feedback.

**Worked examples**

1. **The false alarm that ships today.** Row week 1: 100×3/3/3 → e1RM 110.0. Row week 6: 100×5/5/5 →
   e1RM 116.7. Ratio 1.061 ≥ 1.025 → **progress, silent.** Current app: stall warning.
2. **True stall.** Row week 1 100×5/5/4 → 116.7. Best in the last 3 weeks 100×5/5/5 → 116.7. Ratio 1.000
   → **stalled.** Fires, correctly.
3. **Boundary.** Prior best 100×5 = 116.67. Recent best 102.5×5 = 119.58. Ratio 1.02500 → `>=` → passes
   by exactly the threshold. One 2.5 kg jump in three weeks on a 100 kg lift counts as progress.
4. **Regression.** Prior best 110×5 = 128.3, recent best 100×5 = 116.7. Ratio 0.909 → stalled. The
   current `Math.max(...hits)` over *all* history would score this as progress forever, because the
   week-3 peak is still in the max.
5. Week 6, Squat logged 5 times, SLDL logged twice total (both in the recent block) → Squat tested;
   `Not enough sessions on SLDL to judge. Log it weekly.`

**Rationale.** `[Certain]` an estimated 1RM captures both variables the programme progresses — load and
reps — and reduces to load alone when reps are held constant, so it is strictly a superset of the current
test and cannot make it worse. `[Convention]` Epley is accurate enough at 3–8 reps for a trend comparison;
it is not a max attempt and must never be displayed as one. The 3-week blocks reproduce the brief's week-1
vs week-6 comparison at week 6 and then keep working, which the fixed baseline does not. 2.5% over six
weeks is a deliberately low bar: failing it is a genuine finding.

---

## 5. Rule V1 — the reduced-volume tier (rejects the "Full volume" checkbox)

The brief: *"✂ = cut for weeks 1–4, reintroduce **one per session from week 5** only if recovery is
holding."* The app: one global boolean, `S.includeCut`, that adds all nine back at once, with copy that
says "Leave this off for the first four weeks" and then nothing. Two failure modes: he ticks it in week 2
and buries himself — which is the exact outcome the brief's `[Likely]` warning exists to prevent — or he
never ticks it and trains reduced volume forever.

```
Rule: V1 — volume tier and accessory reintroduction
Applies to:   which exercises render on the Session screen. All days.
Inputs:       trainingWeeks (see ST1); per-day counter reintro[dayId] (persisted, default 0);
              per-day lastReintroDate; ST1 output; D1 deload state.
Logic:        Weeks 1-4:   render only exercises without cut:1. No toggle, no override.
              Week 5+:     render exercises without cut:1, plus the first reintro[dayId]
                           entries of that day's REINTRO_ORDER.
              Offer:       on opening a session, if trainingWeeks >= 5
                           AND reintro[dayId] < that day's cut count
                           AND lastReintroDate[dayId] is null or >= 7 days ago
                           AND ST1 reports no stall
                           AND no deload is active
                           -> show the offer with a single yes/no.
                           Yes: reintro[dayId] += 1, stamp lastReintroDate.
                           No:  stamp lastReintroDate, ask again in 7 days.
              Rollback:    if ST1 fires, or D1 triggers, decrement reintro[dayId] for every
                           day by 1 (floor 0) and tell him.
REINTRO_ORDER: d1: [Rack chin]
               d2: [Leg extension]
               d3: [DB row or shrug, Upright row]
               d4: [Seated leg curl, Leg press]
               d5: [Incline cable fly, Rope pressdown, Spider curl]
```

**Output copy**

- Weeks 1–4, on the Train screen, replacing the checkbox: `Week 3 of 4 at reduced volume. The cut exercises come back from week 5.`
- The offer: `Add Rack chin back to this session? Only if last week left you recovered and no lift went backwards.` Buttons: `Add it` / `Not yet`
- Accepted: `Rack chin is back in. That is the only addition for 7 days.`
- Declined: `Left out. Asked again next week.`
- All back: `Full volume. All 9 accessories are in.`
- Rollback: `Progress stalled. Pulling Upright row back out for now.`
- Train screen status line, always: `Week 7 · 4 of 9 accessories back in.`

**Not enough data.** `trainingWeeks` counts only weeks with ≥3 logged sessions, so a lifter who logs
twice a week for eight calendar weeks is still in the reduced-volume block. That is correct: the tier is
a function of accumulated training, not of the calendar. Copy: `Week 5 by the calendar, week 3 of real
training. Reduced volume holds.`

**Worked examples**

1. Week 3, opening Lower power → 6 exercises (Leg extension hidden). No offer. No toggle anywhere.
2. Week 5, first Chest & arms session, no stall → offer Incline cable fly. He taps `Add it` → 8 exercises. Week 5's Back & shoulders session offers DB row or shrug separately. One per session, per the brief.
3. Week 5, offer accepted Monday. Wednesday's Back & shoulders offers its own first accessory (different day, its own counter). Monday's day does not offer again until the following Monday.
4. **Failing case.** Week 8, `reintro.d1` = 1, ST1 fires on Row → offer suppressed and `Progress stalled. Pulling Rack chin back out for now.` `reintro.d1` back to 0.
5. **Boundary.** Week 5 exactly, `trainingWeeks` computed from 5 weeks each containing 5 logged sessions → offers begin. Same calendar date but weeks 2 and 4 held only 2 sessions → `trainingWeeks` = 3 → no offer.

**Rationale.** `[Likely]`, per the brief, full PHAT volume from a low-intensity baseline buries a lifter
in about three weeks; the whole point of the ✂ tier is a ramp, and a checkbox that restores nine
exercises in one tap is not a ramp. Gating each addition on a week of recovery and on the stall detector
is the only way the app can honour "only if recovery is holding" without a recovery input it does not have.

---

## 6. Rule R1 — rest periods (B-09: **confirm**, numbers below)

Straight from the brief; the app currently shows the speed-work figure as static text and nothing else.

```
Rule: R1 — rest targets
Applies to:   every exercise, Session screen timer.
Inputs:       ex.k, ex.hi. Timer starts when the reps field of a set is committed.
              The timer stores an absolute start timestamp, never an interval count,
              so backgrounding the phone does not lose it.
Logic:        k = "power", hi <= 8   -> ready at 150 s, cap 180 s
              k = "power", hi >  8   -> ready at 120 s, cap 180 s
              k = "hyp",   hi <= 12  -> ready at  90 s, cap 120 s
              k = "hyp",   hi >  12  -> ready at  60 s, cap 120 s
              k = "speed"            -> ready at  60 s, HARD cap 90 s
              Past the cap the display turns amber. Past 2x cap it stops counting
              and reads "Rest over".
```

**Output copy**

- Counting, before ready: `Rest 1:12 · go at 2:30`
- At ready: `Ready.`
- Past cap, power/hyp: `3:20. You are past the rest window. Go.`
- Past cap, speed: `1:38. Too long for speed work. Go now or drop the weight.`
- Past 2× cap: `Rest over.`

**Not enough data.** None needed — this is a fixed table. The timer must never block the input fields
and must never be the reason a set fails to save (constraint 3 in CLAUDE.md).

**Worked examples**

1. Squat, `k:"power"`, hi 5 → ready 150 s, cap 180 s. Brief says 2–3 min. ✓
2. **Boundary.** Cambered bar curl, `k:"power"`, hi 10 → still a power day → ready 120 s. `[Opinion]` the
   bottom of the brief's 2–3 min band is enough for 6–10 rep assistance; the 3-minute end exists for the
   3–5 rep work. The brief's day-level band is respected either way.
3. Lateral raise, `k:"hyp"`, hi 20 → ready 60 s, cap 120 s.
4. **Failing case.** Row speed work, set 3, he is at 2:10. → `2:10. Too long for speed work. Go now or drop the weight.` `[Certain]` the short rest *is* the stimulus in speed work; at three minutes' rest 6×3 at 67.5 kg is not speed work, it is six easy triples.

---

## 7. Rule SP1 — speed-work load (B-12: **confirm** — compute the kg)

The brief: 65–70% of the 3–5RM on that lift. The app prints
`65–70% of your power-day top set. Rest 60–90 seconds.` and leaves him doing arithmetic between sets
with chalky hands. It also says "top set", which is not the same thing as a 3–5RM — his top set could be
a 3-rep grinder or a 5-rep easy set.

**Yes, compute it.** The data is already in the log.

```
Rule: SP1 — speed-work prescribed load
Applies to:   k:"speed" (d3a Row, d4a Squat, d5a Flat DB press). Session screen.
Inputs:       SPEED_SRC = { d3a: "d1a", d4a: "d2a", d5a: "d1d" }
              R = the heaviest completed set weight on the source exercise, in the last
                  28 days, with reps in [3,5] inclusive.
                  If none: widen to 56 days.
                  If still none: no number.
Logic:        target = round2.5(R * 0.675), ties downward.
              band   = round2.5(R*0.65) .. round2.5(R*0.70)
              Recompute every session. Never cache the number.
              Live check: if a logged speed set's weight > R * 0.75
                          -> flag it, do not treat it as speed work.
```

**Output copy**

- With data: `67.5 kg. 65–70% of your 100 kg triple. Rest 60–90 s. Fast, never grinding.`
- Too heavy logged: `82.5 kg is not speed work. Drop to 67.5 kg.`
- The "do not grind" instruction, made actionable — replacing `Submaximal and fast. Do not grind these.`:
  `If a rep slows down, the set is over. Cut the weight, not the sets.`

**Not enough data.** Do not guess from a 10-rep set, and do not fall back to `topSet`:
`Log a heavy triple on Bent-over row and this becomes a number. Until then: 65–70% of a weight you could triple.`

**Worked examples**

1. Bent-over row, 12 days ago, 100 kg × 5. R = 100 → `67.5 kg. 65–70% of your 100 kg triple.`
2. **Boundary.** Two candidates in window: 105 × 3 and 100 × 5. Both have reps in [3,5]; heaviest wins → R = 105 → target 70 kg (105 × 0.675 = 70.875 → 70.0).
3. **Failing case.** Last row session was 90 kg × 8. Reps outside [3,5] → excluded → nothing in 28 or 56 days → no number, show the fallback copy. Deliberate: 90×8 implies a 3–5RM near 105, and inferring that and printing 71 kg dresses an estimate up as a measurement.
4. Squat speed day, source squat 140 × 4 nineteen days ago → 94.5 → **95 kg**. He logs 110 kg on set 1: 110 > 140 × 0.75 = 105 → `110 kg is not speed work. Drop to 95 kg.`
5. Flat DB press speed work: R is read **per dumbbell** (defect D-3). 35 kg/DB × 4 → target 23.5 → **22.5 kg per DB.** If D-3 is not fixed first, this rule cannot ship.

**Rationale.** `[Certain]` the app holds the exact data the percentage refers to; printing a percentage
instead of a load is asking the user to do a calculation the machine can do, in the worst possible place
to do arithmetic. `[Convention]` a completed set of 3–5 reps is the standard field proxy for a 3–5RM —
it is not a true max, which is why the copy says "your 100 kg triple", not "your 1RM".

---

## 8. Rule D1 — deload (B-18: **amend**)

**Ruling: this programme does not need a scheduled deload, and the app should not invent one.**

`[Certain]` PHAT as published contains no deload week. `[Likely]` a lifter in a 300 kcal surplus, sleeping
normally, at 5 sessions a week, does not accumulate fatigue at a rate that justifies pre-emptively
throwing away one week in six — and the brief has already built the ramp that a novice-to-this-volume
lifter needs, in the form of the 4-week ✂ block. Adding a calendar deload on top would mean roughly a
third of the first 12 weeks is spent at reduced stimulus. I disagree with scheduled deloads here because
the fatigue is hypothetical; what I would do instead is trigger on evidence; the risk in my approach is
that a trigger fires late, which costs a bad week, not an injury.

`[Opinion]` What B-18 mostly asks for is *cycle awareness*, and that is worth building on its own.

```
Rule: D1 — deload trigger and content
Applies to:   whole-programme state. Train screen banner.
Inputs:       ST1 output; per-lift missed-prescription history; trainingWeeks;
              weeks since last deload.
Logic (any one triggers a RECOMMENDED deload, never an automatic one):
  T1 Performance drop: on any one key lift, two CONSECUTIVE sessions in which he
     fails to reach `lo` reps on all prescribed sets at a load he has previously
     completed for the full prescription.
  T2 Broad stall:      ST1 reports stalled on >= 2 of the 4 key lifts.
  T3 Calendar backstop: 9 consecutive trainingWeeks with no deload taken.
Content of a deload week (1 week, then resume at the same loads):
  - Power days: same weights, 2 sets instead of 3, stop 2 reps short of `hi`.
  - Hypertrophy days: 2 sets per exercise, all cut:1 accessories out.
  - Speed work: unchanged. It is already submaximal and low-fatigue.
  - Do not reduce the weight. Reduce the sets and the proximity to failure.
```

**Output copy**

- Trigger banner: `Two sessions where Squat went backwards. Take a deload week: same weights, 2 sets, stop 2 reps short. Resume where you left off.` Buttons: `Start deload week` / `Not now`
- Declined: `Noted. Asked again after the next session.`
- Active: `Deload week, day 3. Same weights, 2 sets, 2 reps short. Do not chase numbers this week.`
- Ended: `Deload done. Back to full sets at your last working loads.`
- Cycle display, permanent on the Train screen, which is the part of B-18 that has standing value:
  `Week 7 · full volume phase · 4 of 9 accessories back · last deload: none`

**Not enough data.** Before `trainingWeeks >= 6`, T2 and T3 cannot fire and T1 needs a previously
completed load to compare against. Show only the cycle line, no deload language at all. A deload
recommended to someone six sessions in is nonsense and will teach him to ignore the banner.

**Worked examples**

1. Week 4. Bad squat session, 3 reps at 120 where he had done 5. Single session → **no trigger.** One bad
   day is a bad day.
2. **T1 fires.** Squat sessions: 120×5/5/5 (completed), then 120×2/2/2, then 120×3/2/2. Two consecutive
   failures below `lo`=3 on all sets at a previously completed load → recommend a deload.
3. **T2 fires.** Week 9, ST1 reports Row and DB press stalled → recommend a deload. Note the interaction:
   V1 also rolls one accessory back out. Both are correct and both should be stated.
4. **Boundary.** `trainingWeeks` hits exactly 9 with no deload and no other trigger → T3 fires:
   `Nine weeks straight. Take a deload week before something makes you.`
5. **Failing case, deliberately not a trigger.** He misses two sessions to a work trip and comes back
   weaker for one session. Not two *consecutive* sessions of failure, and ST1's blocks need 2 sessions
   each → nothing fires. Absence is not fatigue.

---

## 9. Rule H1 — hypertrophy verdict (new defect, not in the backlog)

`verdictFor`'s hypertrophy branch compares total tonnage against `lastFor(ex.id)` and nothing else. Two
problems, both live today.

**(a) It fires mid-set.** `paintVerdict` runs on every keystroke. Type set 1 of 3 and the app compares
one set's tonnage to a full previous session and prints `Volume down 66%. Add a rep or 2.5 kg next time.`
He is one set into the exercise. This is wrong advice delivered at the worst moment.

**(b) It is blind to the rep range.** Seated cable row is prescribed 3 × 8–12. Do 3 × 20 with a much
lighter weight and tonnage can rise, so the app says `Volume up 8%` while he trained a completely
different quality. Tonnage is a reasonable secondary signal; range compliance is the primary one.

```
Rule: H1 — hypertrophy-day verdict
Applies to:   k:"hyp". Session screen.
Inputs:       ex {s, lo, hi, inc}; this session's completed sets; the last logged entry
              for the same exercise id.
              Minimum: completed sets >= ex.s. Below that, no verdict.
Logic (first match wins):
  1. C[0].r < ex.lo                       -> too heavy
  2. every r > ex.hi                      -> too light, add weight
  3. previous entry missing, or previous has < ex.s completed sets -> baseline
  4. tonnage vs previous tonnage          -> up / matched / down, as today
  Override: Rule S1 note downgrades case 2 to hold.
```

**Output copy**

- Too heavy: `6 reps at 40 kg. Below the 8–12 range. Drop to 37.5 kg.`
- Too light: `All sets above 12. Go to 42.5 kg next session.`
- Baseline: `First time logged. This becomes your baseline.` *(unchanged)*
- Up: `Volume up 6% — 1,240 kg against 1,170 kg.` *(unchanged)*
- Down: `Volume down 8%. Add a rep or 2.5 kg next time.` *(unchanged)*

**Not enough data.** Fewer than `ex.s` completed sets: render nothing.

**Worked examples**

1. Seated cable row 3 × 8–12, logged 60×10, 60×10, 60×9; last time 57.5×10×3 → tonnage 1740 vs 1725 → `Volume up 1% — 1,740 kg against 1,725 kg.`
2. **Boundary.** 60×12, 60×12, 60×12 — every set at `hi` but not *above* it → falls through to case 4, tonnage comparison. Correct: 12 is inside the range, so the prescription was met, not exceeded.
3. **The mid-set bug.** One set entered, 60×10, of three. Today: `Volume down 66%.` Under H1: nothing.
4. **Failing case.** 30×20, 30×20, 30×20 on an 8–12 exercise. Today: `Volume up 20%`. Under H1: `All sets above 12. Go to 42.5 kg next session.` (case 2 before case 4).

---

## 10. Rule S1 — pain, and the edge of what this app may say

The note field's own placeholder invites it: `Note — RIR, form, pain, anything`. The app then stores the
word "pain" and carries on recommending +2.5 kg. That is the app soliciting a medical signal and
discarding it.

**I am not his doctor and neither is the app.** It must not assess, grade, or work around pain. It must
do exactly two things: stop recommending more load on that movement, and point him at a person.

```
Rule: S1 — pain flag
Applies to:   every exercise role, all screens where a note is attached.
Inputs:       the exercise note. Match /\b(pain|hurt|hurts|injur\w*|sharp|pinch\w*|tweak\w*|strain\w*)\b/i
Logic:        On match, for that exercise:
              - suppress any verdict that increases load or reps (P1 cases 3-4, H1 case 2);
                show the hold copy instead
              - show the notice below, every session, until a later session logs that
                exercise with no matching note
              - never diagnose, never suggest a substitute exercise, never suggest a stretch,
                a rep range, or "work around it"
```

**Output copy** (fixed string, no interpolation, no softening):

```
You logged pain on this. Not something this app can assess.
Holding the weight. If it is sharp, or it repeats, stop the exercise and see a physio or a doctor.
```

**Not enough data.** Not applicable — the rule *is* the refusal. A keyword match is a blunt instrument
and will occasionally fire on "no pain". `[Opinion]` that false positive costs one held session and one
line of text, which is the right side to be wrong on.

**Worked examples**

1. Squat note "left knee pain on set 2", sets 120×5/5/5 → P1 case 4 would add weight; suppressed → hold copy plus the notice.
2. Note "no pain today, felt strong" → matches `pain` → notice shows, weight held. Accepted cost.
3. Note "RIR 1, good bar path" → no match → normal verdict.

---

## 11. Smaller findings

| # | Sev | Finding |
|---|---|---|
| D-4 | P2 | `vWeight` sub-copy says `Target: 0.2–0.3 kg per week` directly beneath logic using 0.2–0.35. Fixed by Rule W1. |
| D-5 | P2 | The app never displays the diet targets it is implicitly managing — 3,200 kcal / 170 P / 300 C / 145 F on training days, 2,500 / 175 / 60 / 175 on rest days. "Add 200 kcal to your training days" is advice about a number the app never shows. Add a static targets panel on the Weight tab. |
| D-6 | P3 | Creatine 5 g daily is a brief non-negotiable with no surface in the app. `[Opinion]` a one-line static reminder is enough; do not build habit tracking. |
| D-7 | P2 | The Session header hardcodes `high-carb day`. Correct today — all five training days are high-carb — but it will be silently wrong if a rest day ever becomes loggable. Derive it from the day, don't hardcode it. |
| D-8 | P3 | Day buttons carry no weekday. The brief fixes Mon/Tue/Thu/Fri/Sat; showing it prevents doing Lower power the day after Lower hypertrophy. |
| D-9 | P1 | `weeksIn()` reads `S.sessions[0].date` and `S.sessions` is never sorted (B-17). Every rule here that gates on a week number inherits that bug. Fix ordering before shipping V1, ST1 or D1. |
| D-10 | P2 | B-10 plate math is blocked on D-3 (per-dumbbell vs pair) and is meaningless for machines. Scope it to barbell exercises only and say so. |

---

## 12. What I am NOT changing

- **The four key lifts.** Row / DB press / Squat / SLDL, per the brief. Correct mapping.
- **The week-6 test's existence, timing and wording.** Settled in the brief. ST1 changes the measure, not the test.
- **2.5 kg as the default increment.** Brief's rule. P1's "add reps first if the jump is unavailable" is an addition for dumbbells and machines, not a replacement.
- **The reduced-volume block being four weeks.** Settled.
- **Any part of the diet other than the adjustment trigger.** Macros, carb placement and the 60 g rest-day floor are settled and correctly absent from the app's logic.
- **Cyclical keto.** Rejected in the brief with reasoning. If it resurfaces, the answer is the brief's.

---

# PROPOSED BACKLOG CHANGES — for `project-manager` to merge

Not applied. `docs/backlog.md` and `docs/decisions.md` untouched, as instructed.

### Amend existing items

| ID | Change |
|---|---|
| B-06 | **Confirm**, retitle to "*Bodyweight rate uses entry count, not dates, and the calorie bands contradict the brief*". Raise scope: the band boundaries are wrong independently of the windowing bug. Spec: Rule W1. Add acceptance criterion: with 8 entries over 24 days the app shows **no** rate and **no** calorie advice. |
| B-07 | **Amend.** Strike "compares against the all-time first session" from the description — that is the brief's week-6 protocol, deliberately, and CLAUDE.md §7 confirms it. The defect is that the measure is weight-only (`topSet`) and that the baseline never rolls forward. Spec: Rule ST1. Acceptance: week 1 `100×3/3/3` → week 6 `100×5/5/5` produces **no** warning. |
| B-08 | **Confirm** as written. Spec: Rule P1. Acceptance: `100/100/95` at 5/5/5 never recommends 102.5 kg. |
| B-09 | **Confirm.** Add the numbers from Rule R1 to the description. Add: the timer stores an absolute timestamp, and never blocks or delays a set save. |
| B-10 | **Amend.** Blocked by new item B-21 (dumbbell unit convention). Scope to barbell exercises. |
| B-12 | **Confirm.** Add the data source from Rule SP1: heaviest set at 3–5 reps on the mapped power lift within 28 days, widening to 56, else silence. Note that the current copy's "top set" is not a 3–5RM. |
| B-18 | **Amend.** Retitle to "*No cycle awareness; deload is autoregulated, not scheduled*". Ruling: no calendar deload. Deliver the cycle display first (`Week 7 · full volume phase · 4 of 9 accessories back`), triggers second. Spec: Rule D1. |
| B-17 | Raise from P2 toward P1: unsorted sessions corrupt `weeksIn()`, which now gates the volume tier, the stall test and the deload. |

### New items

| ID | Sev | Issue | Owner |
|---|---|---|---|
| B-21 | P1 | **Dumbbell load unit is undefined.** The app never states whether DB weight is per dumbbell or per pair. Blocks B-10, B-12/SP1, and makes the "Bench" trend line uninterpretable. Decide per-dumbbell, display it in the target line, migrate nothing (no data yet). | strength-coach ✅ ruled · frontend |
| B-22 | P1 | **"Full volume" checkbox misrepresents the programme.** All-or-nothing toggle vs the brief's one-accessory-per-session-from-week-5 ramp. Replace with a per-day reintroduction counter and a weekly gated offer. Spec: Rule V1. | frontend + backend |
| B-23 | P1 | **Verdicts fire mid-exercise.** `paintVerdict` runs on every keystroke, so one completed set of three produces `Volume down 66%. Add a rep or 2.5 kg next time.` Gate every verdict on `completed sets >= ex.s`. | frontend + backend |
| B-24 | P1 | **Hypertrophy verdict ignores the rep range.** Tonnage-only, so 3×20 on an 8–12 exercise scores as progress. Spec: Rule H1. | strength-coach ✅ ruled · backend |
| B-25 | P1 | **Pain in a note is collected and ignored.** The placeholder invites it; the app then recommends more weight. Suppress load increases and show a fixed referral line. Spec: Rule S1. | ux + backend |
| B-26 | P2 | **`KEY_LIFTS` labels are wrong.** "Bench" is a flat DB press; "Deadlift" is a stiff-leg deadlift. Rename to `DB press` and `SLDL`. | frontend |
| B-27 | P2 | **`d1a` named "Bent-over row"**; the brief says "Bent-over or Pendlay row". Rename. | frontend |
| B-28 | P2 | **Diet targets are never displayed.** The app says "add 200 kcal to your training days" without ever showing the training-day target. Static panel on the Weight tab: 3,200/170/300/145 training, 2,500/175/60/175 rest, creatine 5 g. | ux + frontend |
| B-29 | P2 | **`trainingWeeks` does not exist.** `weeksIn()` counts calendar weeks from session one. Rules V1, ST1 and D1 all need "weeks containing >= 3 logged sessions". Pure function, testable. | backend |
| B-30 | P3 | **Weekday not shown on day buttons.** Brief fixes Mon/Tue/Thu/Fri/Sat. | frontend |

### Suggested sequence for the advice work

B-29 and B-17 first (every week-gated rule depends on them), then B-23 (cheapest correctness win),
then B-08/P1 and B-24/H1 together (same function), then B-06/W1, then B-07/ST1, then B-21 → B-12/SP1,
then B-22/V1, then B-25, then B-09/R1, then B-18/D1.
