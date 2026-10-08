# WO-023 — Keep it permanently: promote an added movement into the plan

Filed by `project-manager`, 2026-10-08, from Chady's ask after his first session using WO-019's door.
Status: **specified**. Nothing built. **Depends on WO-022 and does not start its build without it.**

---

## 0. The ask

> *"I want to be able to, if I add an exercise during the current session and when I click on finish
> session, the app should be prompting me do you want to keep it permanently or just for this session."*

**This is the second ask in this repo's history that comes out of real training, and it came back within
hours of the thing it is about shipping.** WO-019 went live tonight (`4245d13`); he used the door, added a
movement, and found the one thing the door does not do. That is the feedback loop this project has never
had. It is worth saying out loud before anything is planned: **the tooling is finally downstream of the
training.** The standing diagnosis stays suspended.

---

## 1. Reading of it, and the ruling it reverses

**He is asking for a prompt that `docs/decisions.md` ruled, eight hours ago, must never exist.**

> **Decision 4, 2026-10-08 — "an added movement is never offered to the plan. Nobody asks him again."**

That ruling was made on his own words: *"I don't want that to be reflected on the actual workout plan, I
just want that to be specific to this session."* The PM read that as a prohibition. **He meant it as a
default.**

**Amended, not overturned, and the distinction is the whole design:**

| | |
|---|---|
| What stays true | **Adding never touches the plan.** `swAdd` writes `S.draft.entries` and nothing on its path reaches `phat:v1:plans`. The add confirm keeps saying `The plan does not change.` because at that moment it is true. Session-only remains the default and remains free. |
| What changes | **After the work exists, there is one explicit control that offers to keep it.** Nothing is written unless he taps it. |

Read that way the two statements are consistent and the second is a refinement of the first. **Decision 4
is amended in `docs/decisions.md` by this pass, with his sentence and the amendment side by side**, so no
future session re-litigates it from the half of the record it happens to read.

**It is his call, and he has made it.** The PM's job here is to make sure the prompt cannot cost him a
number and cannot write a prescription nobody coached.

---

## 2. Placement — the PM takes the main session's reading, and claims it also takes Chady's

He said *"when I click on finish session."* The main session said *the offer belongs on Summary beside
`Make it permanent`, not as an interstitial.*

**They are the same place, one tap apart, and this is a fact rather than a compromise.** `Finish session`
is `#tosum` (`index.html:3866`) — it is a **navigation to Summary**, not the save. The save is
`Save session`, on Summary. So the screen his tap on `Finish session` produces **is** Summary. A control
in Summary's own stack is what he sees the instant he clicks Finish session, above the save, every time.

**Ruled: no interstitial. The offer is a persistent block on Summary, inside the added movement's own
block, below Rule AD1's sentence** — precisely where §22.7 already puts `Put {X} in the plan` for a
swapped entry, which is *"inside the swapped exercise's block, below its verdict — after the reading, not
before it."* An added card has no verdict; it has AD1's sentence, which is the reading in its place.

Three reasons, in order of weight:

1. **Consistency of the act.** Promote-a-swap and promote-an-add are one idea. Giving them two different
   interaction shapes — a quiet block for one, a modal for the other — means the shape is carrying no
   information and he has to learn both.
2. **Nothing dismissible goes on the road to `Save session`.** The honest statement of the risk, at its
   real strength and not inflated: a modal at `#tosum` writes nothing, so it is **not** a P0 data-loss
   path, and saying otherwise would be rhetoric. What it *is*: a dialog he must clear to reach the exit,
   on the screen that also hosts `#bs-slot`, where a **blocked save** renders. Training him to swipe a
   dialog away on the way to the save is training him to swipe away the one message that means a set did
   not make it. That is a slow cost, it is real, and it is avoidable for free.
3. **It fires on a screen he already scrolls to the bottom of.** §22.20.1 established that, measured, when
   it put `Add an exercise` in that same stack.

**If Chady reaffirms a true interstitial, he gets one** and the fallback is specified in W2: a sheet on
`#tosum`, `Keep it` / `Just today` / dismiss, dismiss **equal to `Just today`** and the navigation to
Summary completing either way, so no tap and no mis-tap can leave him stranded short of the save.
**The session must be savable without answering it.** That is non-negotiable in both designs.

---

## 3. The crux: an added entry has no prescription, and a plan slot cannot exist without one

This is the first question, it is the coach's, and no code starts before it is answered.

A plan exercise is `{id, n, s, lo, hi, k, implement, lift, cut?, cue?, mv?}` and
**`addExercise` refuses without `n`, `s`, `lo`, `hi`, `k` and `implement`** (`logic.js:3237`–`3244`). Its
own header says it: *"`k` and `implement` are REQUIRED. There is no path to an untyped exercise and no
default is guessed here (WO-004 C-7): the add flow asks, or the add is refused."*

An added draft entry is `{sets, note, mv, n}`. What is derivable without inventing coaching:

| Field | Source | Status |
|---|---|---|
| `n` | the entry's own `n` | **Derivable.** `[Certain]` |
| `mv` | the entry's own `mv` | **Derivable.** `[Certain]` |
| `implement` | `PHAT.libraryImplementOf(index, mv)` — **already** how the added card declares one, shipped tonight as B-161's fix under Rule I3.3 | **Derivable, and must reuse that exact derivation.** A second derivation of the same fact is a second fact. `[Certain]` |
| `lift` | minted fresh by `addExercise` when omitted | **Derivable.** See §4 for why this is not the whole answer |
| `cue`, `fig` | nothing supplies them | **Absent, and that is a supported state.** Same family as **B-153**, which already records that `make it permanent` leaves `fig`, `cue` and `implement` behind. Not reopened here |
| `s` | the number of **completed sets he just logged** | An observable fact. Whether an observation is a *prescription* is the coach's call |
| `lo`, `hi` | the reps he just logged | **Where invention starts.** See the three options below |
| `k` | **nothing. The library supplies no `k`** — stated in `addExercise`'s own comment | **Not derivable at any price.** The coach rules, and PV1(b) makes the choice consequential |
| `cut` | nothing | Absent. Means full-volume membership, which is the honest default for a movement he chose to add |

### The PM's recommendation to the coach, offered as a recommendation

**Collect the prescription from him, in the promote sheet, pre-filled from what he just did, and refuse
until `k` is answered — reusing the Plan Editor's add-exercise contract verbatim.**

That contract already exists and was already coach-reviewed: `ADD` is refused naming the empty field until
`k` and `implement` are answered (WO-006 B2), the Type line states the consequence of the option chosen,
and a mismatched rep range warns once (coach Rule K2). Reusing it means **no new coaching surface at
all** — one sheet, one existing set of rules, one existing set of literals.

**Rejected, and named as rejected so nobody proposes it:** a silent default. `3 × 8–12 hyp` is literally
the prototype's `addEx` hard-code that **B-57 struck down** — *"a silent guess that decides what the app
tells him to lift."* It would be that same defect, shipped a second time, through a door built for daily
use.

**Also rejected: refuse and route him to the Plan Editor.** That is what §22.7's read-only line does
today and it is the behaviour he has just told us is not good enough.

---

## 4. The second crux, which nobody has named yet: the promoted slot starts blind

`addExercise` **mints a fresh `ex.id`** (`logic.js:3267`). So a naive promote produces a plan slot whose
id is not the id tonight's sets were logged under. Consequences, traced:

- **Tonight's session is unaffected** — the added entry stays slot-less, so it still gets no `rx`, no
  `sw`, and no verdict. That is the safe half and it must be pinned, not assumed (C4).
- **Next session's card for that slot has no prior of its own.** It falls back through **Rule MV1** —
  `priorFor` crosses slots by movement — **only if** the new slot carries `mv` and tonight's entry carries
  `mv`. Both do, under §3. So the ghost appears with MV1's words naming the fallback.
- **But it is a fallback, with a disclosure sentence, forever**, for a slot that could simply have owned
  its own history.

**PM's position, and it is a backend + coach decision, not a preference:** promote **the entry's own id**
into the plan, so tonight's sets become that slot's own history from the first moment. It is safe from
collision **by construction** — `addDraftEntry` mints the entry id against the draft *and* `takenIds` of
every plan on the device (`logic.js:1588`–`1597`, call site `index.html:7706` passes
`{plan:sp(), plans:allPlans()}`). `addExercise` cannot do this today; it needs either a caller-supplied id
or a dedicated primitive. **W3 builds the primitive.**

The residual risk is honest and small: ids are scoped per plan document, so a plan arriving later by merge
from the other account could in principle carry the same id. That is already a possible state (`resolveEx`
searches across plans) and is **not made worse** here. Named, not solved.

The fallback, if the coach or backend refuses the id-preserving promote: mint fresh and rely on MV1. It
works and it is disclosed. The PM prefers the first.

---

## 5. The third crux: `k` on a power day silently downgrades his coaching

`phatProvenanceReport`'s **PV1(b)** fails a day that holds `k:"power"` together with `k:"hyp"` or
`k:"speed"` (`logic.js:2981`–`2995`). PHAT's `d1` *Upper power* is all `power`.

So: he adds a face pull at the end of Upper power, promotes it, and the coach-recommended `k:"hyp"`
**flips `phatProvenance` to `false` on his plan**, which changes ST1's and D1's sentences from the brief's
assessed diagnosis to the generic one — the one that names *the plan itself* as a candidate cause, which
the PHAT version deliberately excludes.

**Nothing goes silent** — `keyLifts`, `speedSource`, `reintroOrder` and `reducedWeeks` are all preserved
by the copy, so SP1, V1, ST1 and D1 all still run. It is a **copy downgrade**, `[Certain]` mechanically,
and it is exactly the class CLAUDE.md §1 says QA cannot detect: *the code can be perfect and the coaching
wrong.*

Owner: `strength-coach`, W1 question 3, jointly with WO-022 W1 question 2.

---

## 6. Constraint and backlog check

- **§3.1 no build step** — one sheet, one pure primitive, one control. No conflict.
- **§3.2 offline-first** — the promote must complete with the network off. Criterion C7.
- **§3.3 never lose a number** — the live risk, and it is specific: a plan write on the road to
  `Save session`, with an in-progress draft holding every set of the session in memory. C1–C6.
- **§3.4 local dates** — `createdAt` on any copy is `PHAT.localDate()`.
- **§3.5 loads are kg** — untouched. The promoted slot's `implement` is derived, so its load column
  inherits WO-016's / B-161's meaning rather than declaring a new one.
- **§3.6 ≥ 44 px** — the control and every sheet row, measured at 400 px with Playwright.
- **§3.7 secrets** — none.
- **§3.8 `main` always deploys** — starts from `main @ 4245d13`.
- **Schema** — `SCHEMA_VERSION` stays **7**. The log store is not touched. The plans store gains one
  exercise object inside a document whose shape is already schema 7. **No migration.**
- **Open P0s** — none.
- **Depends on an open order: WO-022.** Without copy-on-write this order's primary path refuses on every
  plan he owns.
- **B-165 is inherited, not reopened.** *Added work feeds no engine* — a promoted movement **does** gain
  `cut` membership (absent ⇒ full volume), so after a promote V1 can finally see it. That is an
  improvement and it does **not** close B-165, which is about *un*-promoted added work. Stated so nobody
  claims the close.
- **B-164 / WO-021 is not blocked by this and does not block it.** A promoted slot has an id with
  history, so it is on the *good* side of B-164 from its second session onward.
- **New items filed by this order:** **B-166** (the ask), **B-167** (the dead control / copy-on-write),
  **B-168** (PV1(b) downgrade), **B-169** (the blind promoted slot), **B-170** (B-116's new consequence
  class — a warm-up ramp becomes a prescription).

---

## 7. B-116, seventh asking — and this time it blocks one clause

**Say it plainly, because six work orders have now said it politely.** *Warm-up sets: logged, marked, or
omitted?*

Until tonight B-116 only poisoned **reads**: his five-set 20 → 70 kg ramp on `d1a` is read by every engine
as prescribed work, twenty-six days later. This order makes it poison a **write**.

If `s`, `lo` and `hi` are pre-filled from the sets he logged, and the sets he logged on a movement he has
never done before include a ramp — **which is the single most likely thing for him to do on exactly that
movement** — then the pre-fill is `5 × 3–12`, he taps through it with chalky hands, and **a warm-up ramp
becomes a prescription in his plan, permanently**, feeding P1/H1, R1's rest row, V1's tier and ST1 from
then on.

**Ruled: the pre-fill is blocked on his answer. The order is not.**

- Without an answer, W3 and W4 ship the promote with **no pre-fill** — he types `s`, `lo`, `hi` and picks
  `k` in the Plan Editor's existing form. Strictly safe, fully functional, and it still closes B-166.
- With an answer, W1 rules the pre-fill derivation and W4 adds it.

That is the only escalation available to the PM that is not asking the same question a seventh time in the
same way: **the question now has a feature attached to it that he can see.** Recorded in
`docs/decisions.md` as a process failure in its own right — a note inside a work order has failed to get
this asked six times, so it has stopped being a note.

---

## 8. Work items

### W1 · The prescription, `k`, the position, and the pre-fill — owner: `strength-coach`

**Blocking. No code starts before this lands.** Mandatory under `CLAUDE.md` §1.

Scope, in: five answers in `docs/coach-audit-addendum.md`, as a clause inside **Rule AD1** where one fits
— **no new rule id unless genuinely needed**, following WO-021's precedent.

1. **Where does the prescription come from?** The PM recommends collecting it with the Plan Editor's
   existing refuse-until-answered contract, pre-filled where §7 allows. Confirm, correct, or replace.
   A silent default is rejected by the PM on B-57's record; the coach may overrule that, in writing, with
   the default stated.
2. **Is `s` = completed sets logged a defensible prescription, or is an observation not a prescription?**
   One sentence either way.
3. **`k`.** What does an added-then-promoted movement get, and **does it depend on the day it lands in**
   (§5, PV1(b))? If the answer is "whatever he picks", say what the Type line tells him about the
   consequence — including the provenance downgrade, if W1 of WO-022 rules it must be disclosed.
4. **Position in the day.** `addExercise` pushes to the end of `day.ex` (`logic.js:3275`), which is where
   he did it. Confirm that end-of-day is right, and rule what happens when the draft's `dayId` is not in
   the active plan at all (the D8 state — a resumed draft whose plan moved under it).
5. **The copy, at two moments.** The add confirm says `The plan does not change.` (`index.html:7540`) and
   AD1 says `Added today. No sets or reps set, so no verdict. A verdict needs it in your plan.` Both must
   read as *a default and an option*, not as a contradiction and not as nagging. AD1's last clause now
   has a control that satisfies it on the same screen — **say whether it still earns its place or whether
   the control has replaced it.**

Out: the UI, the words on the button, the sheet layout. Those are W2.

Acceptance criteria:
- All five answered, each with a confidence tag, under numbered addendum sections.
- Question 3's answer is unambiguous about whether the day constrains `k`.
- If a pre-fill is ruled, it is stated as a derivation a backend engineer can implement without judgement
  (e.g. *"`s` = completed sets; `lo` = min logged rep; `hi` = max logged rep; clamp to the editor's
  bounds"*), and it is **conditional on B-116** in writing.
- Question 5 returns either "AD1's sentence stands" or the replacement literal.

Depends on: — (may run in parallel with WO-022 entirely)

### W2 · The offer: where, what it says, what it refuses — owner: `ux-designer`

Scope, in: a new §22.22 of `docs/specs/wo-004-screens.md`. Covering:

- **The primary design** (§2): a block inside the added movement's Summary block, below AD1's sentence,
  mirroring §22.7's geometry and its 300 ms arm. One control per added movement — he may add two.
- **The fallback design**, specified in full but marked *not built unless Chady reaffirms*: the `#tosum`
  interstitial, `Keep it` / `Just today` / dismiss, **dismiss ≡ `Just today`**, navigation to Summary
  completing in every branch.
- **The confirm**, carrying every fact the tap commits to: the prescription he is about to write, the day
  it lands in, that a copy of the plan is made and becomes active (WO-022's three facts, by reference not
  by restatement), and that **today's sets are not re-judged**.
- **The copy for the prescription form**, reusing the Plan Editor's literals wherever they exist and
  naming every new one.
- **The refusal states**, in §2.2's shape: the plan write failed; the draft's day is not in the plan; the
  movement is already in that day (an exact-`mv` duplicate — say what happens, do not let it be
  discovered).
- **Undo**, and what it undoes: the slot, or the slot *and* the plan copy. One act, one undo.
- **The negative space**, written down: nothing appears for an added movement with no completed sets;
  nothing appears on a session card; nothing appears after `Save session` has run.

Out: §22.21 and §22.7's read-only row, which are WO-022 W2's. **Two UX agents must never be in
`wo-004-screens.md` at once — this lane and WO-022 W2 are serialised by the main session, not
concurrent.**

Acceptance criteria:
- §22.22 exists; every literal marked NEW; every size a number at 393 px and 400 px, ≥ 44 on both axes.
- The primary and fallback designs are both complete enough to build without a second UX pass.
- One explicit sentence: **the session is savable without answering the offer**, in both designs.
- No string claims a set is on a chart (§22.16 #5).
- The duplicate-movement case has a stated behaviour.

Depends on: W1 (for the prescription's shape and the copy at both moments)

### W3 · `promoteDraftEntry` — one pure primitive — owner: `backend-engineer`

Scope, in: `logic.js` only.

```
promoteDraftEntry(plan, dayId, exId, entry, spec, index) -> {ok, plan, exId, lift, problems}
```

- Writes a new exercise into `plan`'s day `dayId`, **carrying `exId` verbatim** (§4), refusing if that id
  is already taken anywhere in that plan.
- `n` and `mv` come from `entry`; `implement` is derived through the **existing**
  `libraryImplementOf(index, mv)` call path and is never re-implemented; `s`, `lo`, `hi`, `k` come from
  `spec` and are validated by the **same predicates `addExercise` uses** — shared, not copied.
- Refuses a `readOnly` plan, exactly as `addExercise` does. The caller pairs it with
  `PHAT.editableTarget` (WO-022 W3).
- Returns a **new** plan; the argument is never mutated; `ok:false` returns the original untouched.
- No clock, no DOM, no globals.

Out: the store write, the UI, any change to `addExercise`'s signature, any change to `addDraftEntry`.

Acceptance criteria:
- Pure: the input plan is `JSON.stringify`-identical after every call, including every refusal.
- The promoted slot's `id` **equals the draft entry's id**, and `resolveEx` finds it.
- `n`, `mv` and `implement` on the slot match the entry and the library derivation exactly; `implement` is
  produced by the same code path the added card already uses (asserted by comparing the two outputs, not
  by re-deriving).
- Missing or invalid `s` / `lo` / `hi` / `k` is refused with the same `problems` shapes `addExercise`
  emits — asserted field by field, so the two can never drift.
- A duplicate id anywhere in the plan is refused and the plan is untouched.
- An unknown `dayId` is refused and the plan is untouched.
- **`phatProvenanceReport(after)` is asserted explicitly for a `hyp` slot promoted into `d1`**, pinning
  §5's downgrade as a known, tested fact rather than a surprise.
- Zero bytes change in any session document: a saved session built from the same draft before and after
  the promote is byte-identical except where W1 ruled otherwise.

Depends on: W1, WO-022 W3

### W4 · Build the offer — owner: `frontend-engineer`

Scope, in: `index.html` only. The Summary block from §22.22, the prescription sheet, the confirm with its
300 ms arm, the tap path `editableTarget` → `promoteDraftEntry` → `save()` (read-before-write, WO-013),
the toast and the undo.

Out: `logic.js`, `tests.html`, the interstitial fallback unless Chady has reaffirmed it, any pre-fill
unless W1 ruled one under §7.

Acceptance criteria:
- **The offer renders only for an added entry with at least one completed set, only on Summary, only
  before the save.**
- `vSummary` still writes nothing on render: reaching Summary, leaving it and coming back leaves
  `phat:v1:draft` **byte-identical** (the screen's own criterion 1, `index.html:3990`). Re-run, do not
  assume — and do not "protect" it by refusing the control (`docs/decisions.md`, 2026-10-08 §6).
- Tapping the offer and confirming: the plan has the new slot at the end of the draft's day, with the
  draft entry's id; the active plan is editable; the toast names the day.
- Tapping `Not now`, the scrim or Escape: `phat:v1:plans` byte-identical.
- `Save session` works, with the offer unanswered, on the first tap, every time.
- Measured at 400 px with Playwright: every target ≥ 44 px, nothing in a top corner.
- With the network off, the whole flow completes.

Depends on: W2, W3

### W5 · Verify — owner: `qa-engineer`

Scope, in: regression tests in `tests.html` for W3, a browser pass for W4, and these criteria.

**Data criteria. The first four are the reason this order is not three lines.**

- **C1 · The promote cannot cost a set.** Nine cards, sets typed on seven of them including a half-typed
  row and a notes-only entry, one added movement with three sets. Promote. Then `Save session`.
  **Every one of the seven cards' numbers is in the saved session, byte for byte, including the
  notes-only entry and the half-typed row's committed value.** Then do it again and reload *between* the
  promote and the save: the draft comes back with all of it, and declining the draft discards it and
  leaves the promoted plan standing.
- **C2 · The promote cannot cost the session on a failed plan write.** Force the plans write to fail
  (quota, stub): the refusal renders, `phat:v1:plans` is byte-identical, **and `Save session` then saves
  the whole session including the added entry.**
- **C3 · A stale tab cannot eat the promote and the promote cannot eat a stale tab.** Two tabs, both with
  a draft. Tab A promotes and saves. Tab B saves its own session from older memory. **Both sessions are
  on disk and the promoted slot is still in the plan.** This is the B-76 class; WO-013's lock and overlay
  are what it is testing.
- **C4 · Today's sets are not re-judged by the promote.** The added entry in the saved session has **no
  `rx`** and **no `sw`**, and its card's verdict before and after the promote is the same string.
- **C5 · Next session sees it.** Start the next session on that day: the promoted slot is on the card
  list, at the end, its ghost shows tonight's numbers **as its own prior, with no MV1 fallback
  disclosure** (that is §4's whole point — if the disclosure appears, the id was not carried and the order
  failed its own design).
- **C6 · The history differential.** Every verdict and every history read over every slot on his real
  export, before the promote and after it: identical except for the one new slot. Same shape as WO-014's
  differential hash.
- **C7 · Offline and local dates.** The whole flow with the network off; `createdAt` correct at 23:30 and
  00:30 local in a non-UTC zone.
- **C8 · Provenance is observed, not discovered.** Promote a `hyp` movement into `d1` and record what
  ST1's and D1's sentences become. If W1 ruled a disclosure, it renders. **If W1 ruled the downgrade
  unacceptable, this is a fail, not a finding.**
- **C9 · Backup round trip.** The new slot and the plan copy push and pull back; the merge adds nothing
  and removes nothing on the device that made them.
- **C10 · Suite.** Green, zero skips, zero named failures, three meta-tripwires intact, no fixture writing
  a `phat:*` key. Count read from the file.
- **C11 · Red-first.** W3's tests against the pre-W3 `logic.js` from `git cat-file blob`, red for the
  stated reason.
- **C12 · Reachability.** The offer is **absent** for an added entry with zero completed sets, absent on
  every session card, absent after the save, and absent for a swapped entry (that is §22.7's control, and
  two controls in one block is a defect).

Depends on: W4

### W6 · Ship — owner: `release-engineer`

Scope, in: merge to `main`, the 61-file deploy, byte-verify, the `sw.js` VERSION judgement stated.

Acceptance criteria: `PASS 61/61`; live `/logic.js` contains `promoteDraftEntry`; cold offline reload
renders; deploy record written into this order.

Depends on: W5, **and WO-022 W6 is already live or shares this deploy.**

---

## 9. Risks

| Risk | Severity | Handling |
|---|---|---|
| **A plan write on the road to `Save session` loses sets** | the only P0 class this project has | C1, C2, C3. No interstitial. The offer is on Summary, after `Finish session`, and the save works unanswered |
| **A warm-up ramp becomes a permanent prescription** | P1, wrong advice forever, QA cannot detect it | §7. The pre-fill is blocked on B-116; the order ships without it |
| **`k` on a power day silently downgrades ST1 / D1 copy** | P1, wrong-sentence class | §5, W1 Q3, C8. **B-168** |
| **A silent `3 × 8–12 hyp` default** | P1, and it is B-57 shipped twice | Rejected in §3 by name; the coach may overrule only in writing |
| **The promoted slot starts blind and leans on MV1 forever** | P2 | §4, W3's id-carrying promote, C5. **B-169** |
| **"Which plan is active" changes mid-session, unannounced** | P2 | WO-022 W2's three facts, stated before the tap |
| **A promoted slot inherits no `cue` and no `fig`** | P3 | Known, B-153's family, not reopened. The photograph is absent; the card still renders (UX §11: a missing figure removes the node) |
| **Two UX agents in `wo-004-screens.md`** | process | WO-022 W2 and WO-023 W2 are serialised by the main session |
| **Cross-plan id collision after a merge** | P3 | Already possible today; not made worse. Named in §4 |

## 10. Needs from Chady

1. **B-116, seventh asking. One sentence: warm-up sets — logged, marked, or omitted?** This is the only
   item that gates a clause of this order rather than being a note in it.
2. **Does he want the true interstitial on `Finish session`?** The PM recommends no and has given the
   reason (§2). The offer is one tap away either way. If he says yes, W2's fallback is built as specified.
3. **Nothing else.** The prescription, `k`, the position and the copy are agent decisions — the coach's.
   The placement is the PM's unless he overrules it. Copy-on-write's naming is UX's.
