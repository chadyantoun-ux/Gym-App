# WO-023 — Keep it permanently: promote an added movement into the plan

Filed by `project-manager`, 2026-10-08. **Re-cut the same day, by Chady.**
Status: **specified**. W1 closed and signed off. Nothing built.

> ## THE CUT — his words, and what they bind
>
> > *"please don't change anything already implemented, it's working as expected. just allow me the 'add an
> > exercise' when needed and allow me to decide if it's permanent or just for the session."*
>
> **The deliverable is exactly that and nothing else.** Two instructions, and the first binds hardest.
>
> | | |
> |---|---|
> | **Nothing already shipped moves** | §22.7's `Put {X} in the plan` and its read-only line render **exactly as they do today**, literal #47 included. The `Swap` sheet, `Add as well`, the added card, AD1's sentence, `Add an exercise` (§22.20), the navrow, `Finish session`, `Save session` — **untouched**. WO-022's W4 is cut. Its UX section §22.21 stays on disk as a spec for a later order and is not built |
> | **The whole feature is one new thing** | A control in the added movement's **Summary block** that writes it into the plan, with a form that collects the prescription. That is the order |
>
> **Copy-on-write is folded in, not sequenced.** If his active plan is read-only the promote makes the
> editable copy **as part of that one tap** (W3a). The swap path is not touched, no existing control is
> re-wired, and nothing waits on the question of which plan he is on — see §5.
>
> **B-116 is off this order's critical path.** The coach ruled the prescription is **collected, never
> guessed**: `s`, `lo`, `hi` are empty fields, `k` is unselected, and there is no pre-fill and **no derived
> hint line**. The clause B-116 gated is not being built, so the gate came off **because the clause was
> cut, not because the question was answered.** He has not answered it. B-170 stays open on its own merits
> and `s` is refused on arithmetic grounds that survive any answer he gives (§6).

---

## 0. The ask

> *"I want to be able to, if I add an exercise during the current session and when I click on finish
> session, the app should be prompting me do you want to keep it permanently or just for this session."*

**The second ask in this repo's history that comes out of real training, and the first that comes out of a
thing we shipped the same day.** WO-019 went live (`4245d13`), he used the door, added a movement, and found
the one thing it does not do. Then he cut the scope himself, which is the same loop running a second time in
one evening. The standing diagnosis stays suspended.

---

## 1. The ruling it amends

**`docs/decisions.md` Decision 4 of 2026-10-08 — "an added movement is never offered to the plan. Nobody
asks him again."** That ruling read his *"I just want that to be specific to this session"* as a
prohibition; he meant it as a default. **Amended, not overturned:**

| Stands | Changes |
|---|---|
| **Adding never touches the plan.** `swAdd` writes `S.draft.entries` and nothing on its path reaches `phat:v1:plans`. The add confirm keeps saying `The plan does not change.` (`index.html:7540`) — at that moment it is true | **After the work exists, one explicit control offers to keep it.** Nothing is written unless he taps it |

---

## 2. Placement — ruled, and it is not a compromise

He said *"when I click on finish session."* `Finish session` is `#tosum` (`index.html:3866`) — a
**navigation to Summary**, not the save. So the screen his tap produces **is** Summary.

**Ruled: no interstitial. The offer is a persistent block inside the added movement's Summary block, below
Rule AD1's sentence** — the geometry §22.7 already uses for a promote (*"inside the swapped exercise's
block, below its verdict — after the reading, not before it"*). An added card has no verdict; it has AD1's
sentence, which the coach ruled stays unchanged in both places (§25.3.5).

The save path stays clean: **the session must save with the offer unanswered, on the first tap, every
time.** That clause is not negotiable in any design.

---

## 3. What the coach ruled — W1, closed (`80d4924`, addendum §25)

Transcribed so W2, W3 and W4 do not have to re-derive it. **These rulings are not re-litigated.**

### 3.1 The prescription — three sources, and which is which (§25.3.1)

| Field | Source | Ruling |
|---|---|---|
| `n`, `mv` | the entry | **Written** |
| `lift` | **minted fresh** | **Written, minted, never joined to an existing slot's `lift`** — joining puts two prescriptions on one Trend line, which is the B-46 collapse and the whole point of the `d1h` / `d5i` pair |
| `implement` | `PHAT.libraryImplementOf(index, mv)` | **Derived and SHOWN pre-filled and changeable where I3 answers; ASKED where I3 refuses.** See 3.2 — **this is the correction that stops the control dying silently** |
| `s`, `lo`, `hi` | **him** | **Asked. Empty fields. No pre-fill, no derived hint line** |
| `k` | **him** | **Asked. No option pre-selected.** Clause **K3.5** |
| `cut` | **nothing, ever** | **Never written, and `reintroOrder` is never touched.** V1's stored counter is an *index into the day's `reintroOrder` list*, so appending to that list changes what the existing counter means and the app would offer to reintroduce something it never cut |
| `keyLifts` | **nothing, ever** | A slot with one session of history nominated as a stall subject is a six-week verdict on no evidence |
| `cue`, `fig` | nothing | Absent, a supported state. B-153's family, not reopened |

**No "Today you did 3 sets of 12–15" line.** The coach drafted one and struck it: the sets are already
rendered in the same Summary block three inches above the form, and restating them beside an empty field
turns a fact into a suggestion for no information gained.

### 3.2 The correction the order needed — `implement` refuses on 199 of 876 rows

`libraryImplementOf` answers for 677 rows and **I3 refuses 199**. On a refused row it yields nothing and
`addExercise`'s `PLAN_IMPLEMENTS.indexOf(spec.implement) < 0` predicate **refuses the whole promote** — so a
kettlebell swing he added, logged and wants to keep would hit a dead control with no stated reason.

```
I3 derives a value  -> the form SHOWS it, pre-filled, changeable, not asked. Pre-filling a
                       derived FACT is not the same act as pre-filling an observed DOSE: a
                       fact has a source that is not his own fatigue.
I3 refuses          -> the form ASKS, with WO-006 B2's existing implement control and its
                       existing refusal. No new string, no silence, and no promote that
                       dies without saying why.
```

### 3.3 `k` — asked, and the day does not constrain it (clause K3.5)

Refused until answered, **no option pre-selected** (a pre-selected radio is a default, and B-57 is about
defaults, not about dialogs). **The picker offers power, hyp and speed on every day of every plan** — no
field derives `k`, restricting the options *is* the app choosing the protocol, and a mixed-role day is a
legitimate plan shape the coach authored himself (§23.5, PPL3 has three). `KIND_LINE` states the
consequence of the option; Rule K2's warn-once range check fires normally, because unlike a swap there is a
form and all three of `(k, lo, hi)` are being typed for the first time.

### 3.4 Position, and the D8 case (clause AD1.6)

**End of the day, always — including when the draft put the card mid-session via `afterExId`.** A plan is a
prescription, not a transcript of one session, and added work sits behind the work it must not compromise;
end-of-day satisfies *never ahead of a power or speed slot* automatically on all five shipped plans and all
four templates. **AD1.6.3: the slot carries the draft entry's own id**, approved on coaching grounds as
well as mechanical ones — tonight's sets *are* that slot's own history, so a disclosed cross-slot fallback
would be the app hedging about a fact it holds directly. **AD1.6.4: nothing about tonight is re-judged** —
no `rx`, no `sw`, no verdict, no rest target, no Trend line. **AD1.6.5: the day is never substituted and
never created.** **AD1.6.6: the same movement twice in one day warns, it does not refuse.**

Two literals:

```
D8 refusal (NEW):
  That day is not in your plan any more, so there is nowhere to keep this.
  Today's sets still save.

duplicate movement (REUSED, MOVE_WARN.Q4, index.html:4866):
  {Day} already holds {name} at {target}. This puts the same movement there
  twice. Keep one unless you mean both.
```

The second clause of the D8 refusal is `[Certain]`-required: **any refusal reachable from the road to
`Save session` states that the session is safe, or it reads as a failed save.**

### 3.5 AD1's last clause stands (§25.3.5)

`A verdict needs it in your plan.` stays, unchanged, on both surfaces, and **must not become conditional on
whether the control is beside it.** The card outlives the control — the sentence renders on the session card
from the first set and on Summary after the save, states where there is no control on screen at all. A
condition above the control that satisfies it is the control's **reason**, not a duplicate of it.

### 3.6 Zero completed sets gets no offer and no explanation of its absence

There is nothing to write a prescription about, and a greyed control is a question he has to answer by
guessing.

### 3.7 Provenance — clause PV1.2, and it renders never on his current plan

The PV1(b) downgrade is **accepted and disclosed**, gated on
`phatProvenance(before) === true && phatProvenance(after) === false`. The sentence goes **last in the
confirm**, never in the Type line: a Type line describes the *option*, PV1.2 describes the *plan*, and
putting a plan-level fact on an option row makes it look like a property of `hyp`. **On the plan he trains
on today it is unreachable** — that plan is neither PHAT nor derived from PHAT, so provenance is already
false. **B-168 is reclassified from P1 to a recorded consequence.**

---

## 4. What unavoidably touches shipped behaviour — so he decides rather than discovers

**Three things, and only the third is a real change. All three are named here because the cut was
*"don't change anything already implemented"* and honesty about the edges is the whole value of saying it.**

1. **The added movement's Summary block gains a control.** This is **new surface on an existing screen**,
   not a change to an existing control: nothing that renders today renders differently, moves, resizes or
   changes a word. The block below it (`#bs-slot` → `← Back | Save session` → `DISCARD SESSION`) is
   untouched. **Not a change to shipped behaviour in any sense he would notice as one.**
2. **`vSummary` renders one more node.** Its contract — *reaching this screen, leaving it and coming back
   leaves `phat:v1:draft` byte-identical* — is unchanged and must be **re-proved, not assumed** (C6). The
   rule governs rendering, not tapping (`docs/decisions.md` 2026-10-08 §6), so a control there is allowed
   and nobody may "protect" the invariant by refusing it.
3. **If — and only if — his active plan is read-only, the first promote makes a new plan and activates
   it.** That is visible, in two places, and it is the one thing he should rule rather than meet:
   - A new row appears on **Plans**, under `Your plans`, named `{his plan} — my version`, marked active.
   - **That row reads `0 sessions logged` while the plan he has been lifting on keeps all nine**, because
     `sessionsUnderPlan` counts by `planId` and the copy has a new one (`index.html:5018`, coach §25.1).
     True, misleading, and exactly the sort of thing he would report as a bug. Filed as **B-172**.

   **If he is already on an editable copy, item 3 does not happen at all** — `editableTarget` returns the
   store byte-identical, `created:false`, and nothing appears anywhere. See §5.

**Nothing else.** No migration, `SCHEMA_VERSION` stays **7**, zero bytes move in the log store, and no
session document's shape changes.

---

## 5. The premise that was an inference, and why nothing waits on it

**Withdrawn:** the PM's claim that every plan he owns is read-only. It is true of the five **shipped** plans
and it was an **assumption** about which plan he is on. The coach found the contradiction: addendum §22.10
says nine sessions are logged *"on a copy of the 5-day template"*, and a copy is editable by construction
(`copyPlan` sets `readOnly: false`).

**Ruled: specify it correct either way and do not block.** `editableTarget`'s two branches *are* the two
possibilities:

| His active plan | What the promote does | What he sees |
|---|---|---|
| **Read-only** (one of the five shipped) | copy → activate → write the slot, inside one tap | §4 item 3 |
| **Editable** (a stored copy) | write the slot directly. **Store byte-identical apart from the new slot, `created:false`, no copy, no activation** | Only the new slot |

So the build is the same build under either answer, and the answer changes only whether §4 item 3 is
reachable. **WO-022 stops being a prerequisite** — which is the structural reason the fold-in is right and
not merely smaller.

**One line settles it, and it is his:** open **Plans**. The active row under **`Your plans`** means a copy,
editable. The active row among the templates means shipped, read-only. WO-020's export answers it from the
server side and is already specified.

---

## 6. B-116 — off the critical path, and why that is not an answer

**The clause it gated is cut.** The coach ruled `s`, `lo` and `hi` are asked with empty fields, no pre-fill
and no hint line (§3.1). There is no derivation to gate.

**Recorded precisely, because the distinction will matter later:** the gate came off **because the clause it
guarded was cut, not because the question was answered.** He has not answered it. B-170 stays open.

Two further rulings from §25.5 that this order carries forward:

- **`s` is refused on its own merits and an answer to B-116 does not unblock it.** Two arithmetic harms,
  independent of warm-ups: a **too-high `s` switches the verdict off silently** at the C-11 gate
  (`completedSets >= ex.s`) — not wrong advice, *no* advice, with nothing on screen to disagree with; and a
  **too-low `s` makes X1's badge fire every honest week**. A later pass reading *"the pre-fill was blocked
  on B-116"* as licence to pre-fill all three the moment he replies would be wrong.
- **`lo` / `hi` pre-fill stays blocked on B-116.** `lo = min logged rep, hi = max logged rep` on a five-set
  ramp yields `3–12`, permanent, feeding P1/H1, R1's rest row, V1's tier and ST1.

**And a second B-116 route the coach found while in here, accepted and not blocking (§25.4):** the promoted
slot's prior is tonight's unprescribed entry, which carries **no `rx`**, so Rule PE1 sees no epoch boundary
and H1 case 3c does not fire. On an ascending ramp H1 prints a false percentage in a **descriptive**
sentence and issues **no load instruction**; the narrow bad case is an `s` small enough that `Cprev`
captures a heavy top set, which can print a load instruction. **Accepted — the contaminant is not new**
(his 12 Sep ramp is already read as prescribed work) and the alternatives cost the ghost and the seed, the
two things on that card he will actually use. **Required instead: one QA assertion, C13.** Filed as
**B-171**.

---

## 7. Constraint check

- **§3.1 no build step** — one sheet, two pure functions, one control. No conflict.
- **§3.2 offline-first** — the whole promote completes with the network off. C7.
- **§3.3 never lose a number** — the live risk is a plan write on the road to `Save session` with a draft
  holding the whole session. C1–C4. **The save works unanswered.**
- **§3.4 local dates** — `PHAT.localDate()` only; `toISOString()` in the diff is a fail.
- **§3.5 loads are kg** — untouched. `implement` is derived, so the promoted slot's load column inherits
  B-161's meaning rather than declaring a new one.
- **§3.6 ≥ 44 px** — the control and every form row, measured at 400 px with Playwright.
- **§3.7 secrets** — none.
- **§3.8 `main` always deploys** — starts from `main @ 4245d13`.
- **Open P0s** — none.
- **Schema 7, no migration, zero bytes in the log store.**
- **Prerequisite** — **none any more.** W3a is inside this order.

---

## 8. Work items

### W1 · [CLOSED, signed off, `80d4924`] The prescription, `k`, the position, the copy — owner: `strength-coach`

Delivered as addendum §25.3–§25.5, clauses **K3.5** and **AD1.6**, three strings (one new, two reuses),
plus the `implement` correction and C13. Transcribed in §3 above. **Do not reopen.**

### W2 · The promote sheet and its confirm — owner: `ux-designer`

Scope, in: a new §22.22 of `docs/specs/wo-004-screens.md`.

- **The control**, in the added movement's Summary block, below AD1's sentence. Geometry from §22.20.11's
  measured numbers, not invented ones. One control per added movement — he may add two.
- **The form**, which is **WO-006 B2's, reused**: `s` / `lo` / `hi` empty, `k` unselected with `KIND_LINE`
  as the Type line, `implement` pre-filled and changeable where I3 answers and asked with B2's existing
  control where it refuses, Rule K2's range warning live, and B2's existing refusal naming the empty field.
  **No new form.**
- **The confirm**: the slot facts, then **PV1.2's sentence last, under its gate** (the hook is §22.21.11,
  left empty on purpose). 300 ms arm — this is the one control on that screen that changes something outside
  this session.
- **The refusals and warnings**: the D8 literal (NEW, coach's words, both clauses), MOVE_WARN.Q4 (REUSED)
  for the duplicate-movement warning — **a warning, not a refusal** — and the plan-write failure in §2.2's
  shape.
- **The undo**, and what it restores. One act, one undo. **It must re-read the store and refuse on a
  mismatch**; a blind byte restore would delete a plan another tab created, which is B-76 / B-128 and has
  bitten this repo twice (§22.21.10 solved this already — reuse the reasoning).
- **The negative space, written down**: nothing for an added entry with zero completed sets and **no
  explanation of its absence** (§3.6); nothing on a session card; nothing after `Save session`; nothing for
  a swapped entry — that is §22.7's control and two controls in one block is a defect.
- **If a copy will be made, the confirm says so**, reusing §22.21.3's three plan facts by reference. Do not
  reword them: they are coach-adjacent and already written.

Out, explicitly: **§22.7, §22.21, literal #47, the `Swap` sheet, `Add as well`, `Add an exercise`, the
navrow, AD1's sentence, the added card's target slot — none of these may change by one word or one pixel.**
§22.21 stays on disk unbuilt; this section must not contradict it, and should name it as parked.

Acceptance criteria:
- §22.22 exists; every literal marked NEW or REUSED with its source; every size a number at 393 px and
  400 px, ≥ 44 on both axes.
- One explicit sentence: **the session is savable without answering the offer.**
- A diff-level statement listing which existing sections are **not** touched, so W4 has a boundary it can
  check itself against.
- No string claims a set is on a chart (CH1 / §22.16 #5 still bind).
- The `0 sessions logged` consequence (B-172) is either worded or explicitly declared out of scope with a
  reason — not left silent.

Depends on: W1 (closed)

### W3a · `editableTarget` — owner: `backend-engineer`

Scope, in: exactly WO-022 §3 W3, verbatim, exported on `window.PHAT`, pure, no DOM, no clock.
Consumed **only** by the promote.

Acceptance criteria: WO-022 W3's list in full, plus coach §25.6's addition —
- **`state.reintro` and `lastReintroDate` are untouched by `editableTarget`.** They are not its to write.
- The editable-active-plan branch returns a **byte-identical** store and `created:false`.

Depends on: —

### W3b · `promoteDraftEntry` — owner: `backend-engineer`

Scope, in: `logic.js` only.

```
promoteDraftEntry(plan, dayId, exId, entry, spec, index) -> {ok, plan, exId, lift, problems}
```

- **Carries `exId` verbatim** (AD1.6.3), refusing if that id is taken anywhere in the plan.
- `n` and `mv` from `entry`. `implement` from `libraryImplementOf(index, mv)` **when it answers** and from
  `spec` **when it refuses**. `s`, `lo`, `hi`, `k` from `spec`, validated by the **same predicates
  `addExercise` uses — shared, not copied.** Two copies of one validator is two validators and they drift.
- **Mints a fresh `lift`. Never joins an existing one.**
- **Writes no `cut`. Never touches `reintroOrder`. Never adds to `keyLifts`.**
- **Pushes to the end of `day.ex`**, regardless of the draft's `afterExId` order.
- Refuses an unresolvable `dayId` (AD1.6.5) and a `readOnly` plan.
- Returns a new plan; the argument is never mutated; `ok:false` returns it untouched.

Out: the store write, any UI, any change to `addExercise`'s or `addDraftEntry`'s signatures.

Acceptance criteria:
- Pure: the input plan is `JSON.stringify`-identical after every call, including every refusal.
- The promoted slot's `id` equals the draft entry's id and `resolveEx` finds it.
- `implement` on the derived path is produced by the same code path the added card already uses — asserted
  by comparing the two outputs, never by re-deriving. On an I3-refused `mv` with no `spec.implement` the
  call **refuses with a stated problem** rather than emitting an invalid plan.
- Missing or invalid `s` / `lo` / `hi` / `k` refuses with the **same `problems` shapes `addExercise`
  emits**, asserted field by field so the two cannot drift.
- `cut` absent on the new slot; `reintroOrder` and `keyLifts` deep-equal to before, on all five shipped
  plans; `lift` not equal to any existing `lift` in the plan.
- The new slot is the **last** element of `day.ex`.
- A duplicate id, an unknown `dayId`, or a read-only plan each refuse with the plan untouched.
- `phatProvenanceReport(after)` asserted explicitly for a `hyp` slot promoted into PHAT's `d1`, pinning the
  PV1.2 gate's input as a tested fact.

Depends on: W1 (closed)

### W4 · Build the offer — owner: `frontend-engineer`

Scope, in: `index.html` only. The Summary block from §22.22, the form, the confirm with its 300 ms arm, the
tap path `editableTarget` → `promoteDraftEntry` → `save()` (read-before-write, WO-013), the toast and the
undo.

**Out, and this is the cut: no existing control, string, size or presence rule changes.** Specifically not
`index.html:4014` (§22.7's branch, including literal #47), not the `Swap` sheet, not `Add as well`, not
`Add an exercise`, not the navrow, not AD1's sentence, not the added card. If the build appears to require
one of those to move, **stop and raise it** — do not move it.

Acceptance criteria:
- The offer renders **only** for an added entry with ≥ 1 completed set, **only** on Summary, **only** before
  the save, and never for a swapped entry.
- Zero completed sets ⇒ **no control and no explanatory line.**
- `Save session` works on the first tap with the offer unanswered, every time.
- `vSummary` writes nothing on render: reach Summary, leave, come back ⇒ `phat:v1:draft` byte-identical.
- Declining anywhere (`Not now`, scrim, Escape) ⇒ `phat:v1:plans` byte-identical.
- The whole flow completes with the network off.
- Measured at 400 px with Playwright: every target ≥ 44 px, nothing in a top corner.
- **A diff audit against W2's not-touched list: no line of the swap flow, §22.7's branch or §22.20's
  control is modified.** This is a criterion, not a courtesy.

Depends on: W2, W3a, W3b

### W5 · Verify — owner: `qa-engineer`

Scope, in: regression tests in `tests.html` for W3a and W3b, a browser pass for W4, and these criteria.
**C2, C5, C8, C9, C10 and C11 are re-homed from WO-022 W5 and keep their meaning.**

- **C1 · The promote cannot cost a set.** Nine cards, sets typed on seven including a half-typed row and a
  notes-only entry, one added movement with three sets. Promote. Then `Save session`. **Every one of the
  seven cards' numbers is in the saved session byte for byte**, including the notes-only entry. Repeat with
  a reload *between* the promote and the save: the draft comes back with all of it; declining it discards
  the draft and leaves the promoted plan standing.
- **C2 · The promote cannot cost the session on a failed plan write.** Force the plans write to fail: the
  refusal renders, `phat:v1:plans` is byte-identical, **and `Save session` then saves the whole session
  including the added entry.**
- **C3 · A stale tab cannot eat the promote and the promote cannot eat a stale tab.** Two tabs, both with a
  draft. Tab A promotes and saves; Tab B saves its own session from older memory. **Both sessions are on
  disk and the promoted slot is still in the plan.** B-76's class; WO-013's lock and overlay are what this
  tests. Then the same against the undo (§22.21.10's refuse-on-mismatch).
- **C4 · Today's sets are not re-judged.** The added entry in the saved session has **no `rx`** and **no
  `sw`**, and its card's verdict string before and after the promote is identical.
- **C5 · Next session sees it as its own.** Start the next session on that day: the promoted slot is in the
  card list, **last**, its ghost shows tonight's numbers **as its own prior with no MV1 fallback
  disclosure.** If the disclosure appears the id was not carried and the order failed its own design.
- **C6 · Summary still writes nothing on render.** Byte-identity of `phat:v1:draft` across reach / leave /
  return, **before** the control is tapped.
- **C7 · Offline and local dates.** Whole flow network-off; any `createdAt` correct at 23:30 and 00:30
  local in a non-UTC zone.
- **C8 · Provenance is observed, not discovered — and run it on PHAT or a PHAT copy, NOT on his export.**
  (Coach §25.6's correction: on his plan it tests nothing, because provenance is already false.) Promote a
  `hyp` movement into `d1`, record ST1's and D1's sentences, and assert PV1.2's disclosure renders under its
  gate and **does not render** on a plan where provenance was already false.
- **C9 · Backup round trip.** The new slot, and the plan copy if one was made, push and pull back; the merge
  **adds nothing and removes nothing** on the device that made them; the other account's `activePlanId` is
  unchanged.
- **C10 · Suite.** Green, zero skips, zero named failures, three meta-tripwires intact, no fixture writing a
  `phat:*` key. Count read from the file and recorded.
- **C11 · Red-first.** W3a's and W3b's tests run against the pre-change `logic.js` from `git cat-file blob`
  and go red for their stated reasons.
- **C12 · Reachability.** Absent at zero completed sets, absent on every session card, absent after the
  save, absent on a swapped entry.
- **C13 · The ramp case is observed, not discovered** (coach §25.4, required). Promote a movement whose
  session holds a five-set ascending ramp, `s` typed as 3; **record** H1's exact string on the next
  session's card. Repeat with `s` typed as 5 and record H1.3b's string. **Neither is asserted correct —
  both are recorded**, so the day B-116 is answered the fix has a before-picture. **If H1's tonnage branch
  ever gains a load instruction on the "up" side, reclassify to P1 and the `lastFor` exclusion is the fix.**
- **C14 · Nothing shipped moved.** A diff audit plus a browser pass: §22.7's read-only line renders verbatim
  including literal #47, `Add as well` and `Add an exercise` are unchanged, AD1's sentence is unchanged on
  the card and on Summary, and the unswapped verdict/history differential over his real export is
  **identical** to `main @ 4245d13` except for the one new slot. **This is the criterion that enforces the
  cut.**
- **C15 · The copy's session count.** If a copy is made, record what the Plans row reads (`0 sessions
  logged`, B-172) rather than letting it surprise someone.

Depends on: W4

### W6 · Ship — owner: `release-engineer`

Scope, in: merge to `main`, the 61-file manual deploy per `docs/deploy.md`, byte-verify, and the `sw.js`
VERSION judgement **stated** by its own header rule (file list unchanged ⇒ no bump; state it, never assume
it).

Out: `.vercelignore`, `docs/deploy.md` §7, the GitHub App — `CLAUDE.md` §2 is explicit.

Acceptance criteria: `PASS 61/61` against production; live `/logic.js` contains `promoteDraftEntry` and
`editableTarget`; a cold offline reload renders; deploy record written into this order.

Depends on: W5

---

## 9. Sequence

**W2 ∥ W3a ∥ W3b → W4 → W5 → W6.** W1 is closed. Nothing is blocked on Chady. W3a and W3b are independent
of each other and of W2.

---

## 10. Risks

| Risk | Severity | Handling |
|---|---|---|
| **A plan write on the road to `Save session` loses sets** | the only P0 class here | C1, C2, C3. No interstitial. Save works unanswered |
| **The cut is violated by accident** — a shipped string or control moves because it was convenient | P1 against his explicit instruction | W2's not-touched list, W4's diff audit, **C14** |
| **The promote dies silently on an I3-refused movement** | P1, a dead control with no reason | §3.2: ask on a refusal. W3b refuses with a stated problem rather than emitting an invalid plan |
| **A guessed prescription** | P1, B-57 shipped twice | Collected, never guessed. Coach declines to overrule B-57 and says so for the record |
| **`s` typed too high switches the verdict off silently** | P1 | He types it; `KIND_LINE` and K2 are live; C13 records the ramp case |
| **A new plan appears and reads `0 sessions logged`** | P3 display | §4 item 3, **B-172**, C15. Only if his plan is read-only |
| **H1 compares against an unprescribed baseline** | P2, accepted | §6, **B-171**, C13's recording |
| **PV1.2 downgrade** | recorded consequence, not a defect | B-168 reclassified; unreachable on his current plan |
| Cross-plan id collision after a merge | P3 | Already possible; not made worse |

## 11. Needs from Chady

1. **One line, and it changes nothing about the build: open Plans — is the active row under `Your plans`,
   or among the templates?** It decides whether §4 item 3 is reachable at all. Nothing waits on it (§5).
2. **If it is among the templates: is he content that the first promote creates `{plan} — my version` and
   makes it active?** The alternative is refusing the promote on a read-only plan, which is the behaviour
   he has just said is not good enough. **PM recommendation: proceed, with the confirm saying so.**
3. **B-116 is still owed and no longer gates anything here.** *When you log a warm-up ramp — the 20, 40,
   55, 70 on bench — are those rows in the app as sets, or do you only log the working sets?* One sentence.
   It unblocks a pre-fill nobody is building yet, and it is the last thing standing between him and typing
   four numbers once per promoted movement.
