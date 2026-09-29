# WO-018 — The four splits, and heavy days he can move

Filed by `project-manager`, 2026-09-29. **Supersedes WO-014 Track B (T1–T4), which is closed into this
order**; WO-014 itself is deployed and closed on Track A. Status: **specified**. Nothing built.

---

## 0. Ask

Build all four splits. He answered the question that gated them:

> **the 5-day is Push, Pull, Legs, Upper, Lower**, and *"yes upper/lower are heavy days **but I also get
> to change that as needed**."*

Four templates: the 5-day, a 3-day, a 2-day Upper/Lower, and *"the normal split like any bodybuilder
does"*. **PHAT stays** — his words, *"I want to keep the PHAT exercise"*. Shipped PHAT remains
read-only and remains the default. These are additions.

## 1. The reading, and the half that is most likely to be quietly dropped

WO-014 Q1 asked a yes/no. He answered **yes, and then took it back as a permanent fact**: Upper and
Lower are heavy *today*, and he keeps the right to move that. Two ways to read the second half, and
they produce materially different work, so both are named and one is ruled:

**Reading (A) — it is already built.** He copies a template (`copyPlan`) and the Plan Editor already
lets him change `k`, `lo` and `hi` on any slot. "Heavy" is not a thing in the data model; it is the
value of `k` and the rep range on that day's compounds. Under (A) the ask costs nothing new.

**Reading (B) — a day-level control.** One tap flips a day between heavy and light and the slots follow.

**The PM's ruling: the requirement is neither (A) nor (B) — it is a behaviour, and the behaviour is
where the defect lives.** Under (A), today, he can make Legs heavy and Upper light in the editor — and
**`keyLifts`, `speedSource` and `reintroOrder` are plan-level fields that name slot ids**. They do not
move when he edits a slot. So the week-6 test (ST1), the deload triggers (D1 T1/T2) and the speed loads
(SP1) would keep pointing at the day he just made light, silently, and the app would run its entire
advice layer off the wrong four lifts. **That is the thing that gets quietly dropped**, and it is not a
UI question at all. Filed as **B-158**.

So the acceptance criterion is instrument-agnostic and cannot be satisfied by a toggle that only edits
`k`:

> After he changes which days are heavy, **every subject of the advice layer follows** — `keyLifts`,
> `speedSource`, ST1's lifts, D1's triggers and R1's rest targets all read the new arrangement, and
> nothing still points at the old heavy day. If a subject cannot be re-derived, the feature says so in
> words and goes silent (C7a), rather than answering from the stale one.

Whether the control is (A) plus a re-derivation, or (B) a first-class day toggle, is the coach's and
UX's to rule (T1, T2a). **What is not negotiable is that no template bakes "heavy" in as a fact only
the template author can change.**

## 2. Constraint and backlog check

- **CLAUDE.md §3:** no conflict. Four frozen plan documents in `logic.js` are bytes, not a build step.
  **§3.3 is the one with teeth here:** picking or copying a template must not touch the log store.
- **B-01 / B-02 / B-03** closed. Nothing is built on an open P0.
- **Dependencies that are now discharged:** WO-014 Track A is deployed and live. `mv` on a plan slot
  exists (schema 7, `V_MV`). The library ships — 876 movements, searchable offline, with
  `librarySearch`, `libraryImplement` and `setExerciseMovement` shipped and tested. The "ship Track A
  first" hold is spent.
- **Rules that bind and are not this order's to revisit:** **K3** (`k` is never derived from any
  upstream field — every slot states it deliberately), **I3** (six equipment values map, seven are
  refused; 199 of 876 rows have no honest implement, and I3 asks rather than guesses), **A1** (no
  slash-names: two exercises in one slot is two histories), **WO-006 C-7** (`k` and `implement` required
  at creation), **WO-004 C-6** (ids are opaque and never name-derived).
- **New items:** B-158 (the subjects do not follow), B-159 (alternates per slot — raised, not decided).
- **Sequencing against WO-015 / WO-017:** §5.

## 3. Work order

**T1 · The four templates — owner: `strength-coach`**

Scope — in: `docs/coach-audit-addendum.md` **§23**. Four plan documents, signed off slot by slot the way
PHAT's 42 were, plus two rulings that govern all four.

**Ruling 1 — the heavy-days arrangement, and what moves when he moves it.** He has answered the
arrangement (Upper and Lower heavy, 3–5 on the compounds; Push / Pull / Legs 8–12). What is still owed
is the **keep/lose table** — what the advice layer keeps under that arrangement and what it loses — and
then the part nobody has written: **when he flips a day from light to heavy, what is the correct new
value of `keyLifts`, `speedSource` and `reintroOrder`?** Three options, rule between them:
  (i) the plan declares them and a flip invalidates them → the feature goes silent (C7a) and says why;
  (ii) they are **derived** from the arrangement (e.g. the heaviest compound on each heavy day) and
      follow automatically;
  (iii) the flip prompts him to re-name them.
State the coaching consequence of each in his terms. **Do not pick for him if it is balanced; do pick
if it is not** — the PM's read is that (ii) is right for `keyLifts` and `speedSource` and (i) is right
for `reintroOrder`, `[Guessing]`, offered only so it is not a blank page.

**Ruling 2 — alternates per slot (B-159), raised by his own data.** Both `d1b` notes are him
substituting a pulldown for a pull-up **because his forearm was not recovered** — he substitutes for
injury, not convenience. WO-014's swap already covers the act. The question here is whether a template
slot should **name** one or two sanctioned alternates up front, so the swap lands on a movement the
coach chose rather than on whatever the library search returns mid-set. **A1 still binds: an alternate
is not a slash-name and must not create a second history in one slot.** Rule it; if the answer is yes,
say what field carries them and the PM will scope the build separately. **Do not build it into the four
templates unless you rule it in.**

Then, per template, declare exactly this and nothing less:

| Field | Level | Note |
|---|---|---|
| `name`, `from` | plan | `from` names the source the way PHAT's does |
| `days[]` — `id`, `name`, `wd` | day | rest days are gaps in the cycle, not days in the document |
| per slot — `n`, `mv`, `s`, `lo`, `hi`, `k`, `implement`, `lift`, `cut?`, `cue?` | exercise | **`mv` is a library id at the pinned SHA**, never a hand-typed name. `k` and `implement` are required |
| `keyLifts` (≤ 4), `speedSource`, `reintroOrder`, `reducedWeeks` | plan | **declare or deliberately omit.** An omission is a C7a absent state and must be a decision, not an oversight — say so per template |

**On `implement`: you state it, the library does not.** Rule I3 refuses 199 of 876 rows, and a refusal
is not a default. Where the library cannot say, **the coach writes the value** — that is why the field
is required at creation and why this is a coaching document and not a script. Flag any slot where the
library's mapping and your value disagree.

The four:

1. **Push · Pull · Legs · rest · Upper · rest · Lower** — 5 training days on a 7-day cycle. Day order
   and names are his, exact. Exercises, sets, reps and `k` are yours.
2. **Push · Pull · Legs** — 3 days.
3. **Upper · Lower** — 2 days.
4. **The standard bodybuilder split** — 5 days, one muscle group per day. *"The normal split like any
   bodybuilder does."* The conventional reading is chest / back / shoulders / arms / legs. **This is
   the loosest of the four and it is explicitly not settled** — propose the day order and the exercises,
   and flag in your section that one line of confirmation from him is worth having before it ships.

Out: PHAT's 42 slots, which do not move. The library's `implement` derivation (shipped). The picker's
UI (T3). The editor's controls (T2a).

Acceptance criteria:
- Ruling 1 is a named rule with a confidence tag, a two-column keep/lose table, **and** an explicit
  answer to what `keyLifts` / `speedSource` / `reintroOrder` become when a day's heaviness changes.
- Ruling 2 (alternates) is answered yes or no with a reason, and A1 is addressed either way.
- Every slot in all four templates carries all nine required fields, transcribable without
  interpretation.
- Every `mv` resolves to a real exercise in the shipped library at the pinned SHA, **by id**.
- Each template states, per plan-level field, whether it declares it and why — four explicit decisions
  per template, not silence.
- No slot carries a slash-name (A1).

Depends on: —

---

**T2 · Ship the templates as plan documents — owner: `backend-engineer`**

Scope: the four documents in `logic.js` beside `PHAT_PLAN`, `readOnly: true`, each frozen; the Plans
list reads them; `copyPlan` remains the only route to editing, unchanged.

Acceptance criteria:
- `validatePlan` returns `ok` on all four, asserted per template.
- Slot and day ids across **all five** shipped plans are globally distinct, asserted by a test that
  collects and counts them. A collision merges two plans' histories.
- Every slot's `mv` resolves against the shipped library, asserted by id, for all four templates.
- **Adding four read-only templates changes zero stored bytes on a device that ignores them all** —
  asserted byte for byte on `phat:v1:log`, `bw`, `plans`, `prefs`.
- Picking and copying a template produces an editable plan whose exercise ids are preserved
  (`copyPlan`'s existing behaviour) and whose `planId` is new.
- **No migration.** No schema version moves. If one seems to be needed, stop and report.

Depends on: T1

---

**T2a · The subjects follow the arrangement (B-158) — owner: `backend-engineer`**

Scope: implement T1 Ruling 1 as pure functions. Whatever the coach ruled — derivation, invalidation, or
a prompt — the outcome is that **no engine reads a plan-level subject that names a slot the plan no
longer treats as heavy.**

Acceptance criteria:
- Copy the 5-day template, change Legs to heavy and Upper to light in the editor, and then:
  `keyLifts`, `speedSource`, ST1's subjects, D1's triggers and R1's rest targets each either read the
  new arrangement or return their named ABSENT state with the coach's literal. **None of them returns a
  number computed off the old heavy day.**
- The same assertion on the reverse flip, and on a plan where every day is light.
- **The five shipped plans, unedited, produce byte-identical output to today** — a differential over
  every slot, hashed, the way WO-014 W6 hashed its 16,128 verdicts.
- Pure: no DOM, no globals, no clock.

Depends on: T1, T2

---

**T3 · The picker, and the heavy control — owner: `frontend-engineer`**

Scope: the template picker on the Plans list (reuses WO-014's sheet), plus the control T1 Ruling 1 /
UX specified, if any.

Acceptance criteria:
- All five plans are listed; PHAT is the default and is visibly read-only.
- Picking a template shows what it is before copying (days, slot count), and copying is the only way to
  edit it.
- **Picking, previewing and copying write nothing to the log store** — asserted, not assumed.
- Every target ≥ 44 px; the list is usable at 400 px wide with one thumb, offline.

Depends on: T2, T2a, and UX's word if T1 Ruling 1 asks for a control

---

**T4 · Verify — owner: `qa-engineer`**

Acceptance criteria:
- T2, T2a and T3's criteria, item by item.
- **Data:** with his four real sessions loaded, copying and editing a template leaves `phat:v1:log`
  byte-identical, before and after, asserted. And: mid-edit, reload — the plan edit draft
  (`phat:v1:planedit`) is offered back intact, and declining discards only it.
- The four templates' slots are pinned by id, and a test fails if a slot id collides with any other
  shipped plan's.
- Suite green unconditionally (B-146 discipline), zero skips, three meta-tripwires intact.
- Red-first on T2a's defect: the "subjects do not follow" assertion must go **red** on the pre-T2a tree.

Depends on: T3

---

**T5 · Ship — owner: `release-engineer`.** Depends on: T4. All 61 files, byte-verified. `sw.js` VERSION
by the header rule — the file list does not change, so **v7 stays** unless a cached entry must be
discarded. **Its own deploy — see §5.**

## 4. Sequence

```
T1 coach ──> T2 backend ──> T2a backend ──> T3 frontend ──> T4 QA ──> T5 release
```

**T1 starts now, in parallel with WO-017 W1/W2** — different sections of the same document (§23 vs
§24), no collision, and both are documents.

**Nothing app-side (T2 onward) starts until WO-017's `logic.js` change is merged**, and **T2 onward does
not share a deploy with WO-015**. See §5.

## 5. The sequencing ruling you asked for

**I agree with your instinct and I would tighten it in two places.**

1. **T1 runs now.** It is a document, it collides with nothing, and it is the long pole.
2. **T2–T5 do not land while WO-015 is writing to his log store** — agreed, but the stated reason is not
   the real one. T2–T5 write to the **plans** store and are forbidden from touching the log at all
   (T2's and T4's criteria). The actual hazards are:
   - **One working tree, three lanes, one file.** WO-017 W3, WO-015's repair pass and T2 all write
     `logic.js`. CLAUDE.md §4b: the main session serialises them or gives them separate worktrees, and
     every commit names paths.
   - **Rollback scope.** WO-015 is a one-off, fingerprint-gated pass that rewrites his only real
     training data. If it ships in the same deploy as four new plan documents and a picker, a problem
     with either cannot be rolled back without taking the other with it. **WO-015 ships alone** — that
     is the rule, and it is worth more than the week it costs.
3. **Order of deploys: WO-017 → WO-015 → WO-018 → WO-016.** WO-017 first because it is the smallest,
   writes zero bytes, and is the only one where the app is currently giving advice on an injury it
   cannot see. WO-015 second and alone. WO-018 third. WO-016 (the load column) last of these four
   because it is a data-entry redesign and it must not move `w`'s stored meaning under WO-015's repair
   table.

## 6. Risks

| Risk | Sev | Mitigation |
|---|---|---|
| **The subjects do not follow a heavy-day change** and the advice layer runs off the wrong four lifts, silently | **P1** | B-158; T1 Ruling 1 then T2a; the criterion is behavioural and red-first |
| A template ships with hand-typed names instead of `mv` ids, reintroducing B-46 and shipping slots with no movement identity | P1 | T1's `mv`-resolves-by-id criterion, asserted again in T2 |
| A slot id collides across plans and merges two histories | P1 | T2 and T4 both assert global distinctness across all five plans |
| `k` guessed by a template author instead of stated (K3) | P1 | Every slot states `k`; T1's transcribable criterion |
| `implement` left empty because the library refuses it (I3, 199 rows) | P2 | The coach writes the value; T1 flags disagreements |
| Four more plans is four more things to pick before the first one works — **more tooling, not more training** | P2 | Named in §7. PHAT stays the default; the picker must not make choosing harder |
| Alternates per slot balloon into a second swap feature | P2 | B-159: raised, ruled yes/no by the coach, scoped separately if yes. **Not built inside the templates** |
| **Data at risk:** none directly — but T2–T5 must never write the log store | P1 if breached | T2 and T4 assert byte-identity with his four real sessions loaded |
| **Migration needed:** none | — | T2 stops and reports if one appears |

## 7. Needs from Chady

1. **The bodybuilder split's day order** — chest / back / shoulders / arms / legs, or different? One
   line, and it is the only one of the four whose content is not settled.
2. **Not a question, a statement, and it is the tenth time it is being made.** Four logged sessions in
   seventeen days, and the last one was seven days ago. Four more splits is four more ways to arrange
   training that is not currently happening. **PHAT works, he has it on his phone, and the thing that
   would move the number is a fifth session, not a fifth plan.** He asked for these, the reasoning is
   his to overrule, and they will be built properly. But it is said here first.
