# WO-022 — Copy-on-write: a plan change on a read-only plan makes an editable copy

Filed by `project-manager`, 2026-10-08, out of Chady's ask for a *keep it permanently* prompt (WO-023).
Status: **specified**. Nothing built.

**This order exists because every plan on his device is `readOnly`, so every control that writes a plan
is dead on arrival.** It is the prerequisite half of WO-023 and it has standalone value: it brings `Put
{X} in the plan` (UX §22.7) back to life, and he swaps far more often than he adds.

---

## 0. The ask it serves, and why it is its own order

Chady, 2026-10-08:

> *"I want to be able to, if I add an exercise during the current session and when I click on finish
> session, the app should be prompting me do you want to keep it permanently or just for this session."*

That is WO-023. **It cannot be built on top of nothing.** `addExercise(plan, dayId, spec)` refuses a
read-only plan on its second line (`logic.js:3231`), `setExerciseMovement` refuses on its fifth
(`logic.js:3312`), and all five shipped plans are `readOnly: true` (PHAT plus WO-018 T3's four). So
*every* promote path — the swap's and the addition's — needs the same missing primitive first.

**Ruled: it is a separate order, and the reason is not size.** "Which plan is active" is a decision Chady
makes once, for every promote path there will ever be. Ruling it inside the added-movement order would
rule it by a side door, days before the order that needs it — the failure this repo has already written
down twice (`docs/decisions.md`, 2026-10-08 §5, and *"nothing moves after the pin"*). It is also
independently valuable: UX §22.16 #1 has recorded since 2026-09-28 that `Put {X} in the plan` is
**unreachable for Chady**, and §22.7's read-only line routes him to the Plans screen to do by hand what
one tap should do.

---

## 1. The facts this is planned against — read, not assumed

All verified against `main @ 4245d13`, which is production.

| Fact | Where | Consequence |
|---|---|---|
| `copyPlan(plan, name, todayStr)` already exists and is pure | `logic.js:3438` | Mints a new `planId`, names it `"{src} — my version"`, sets `from: "Copied from {src}"`, `readOnly: false`, `createdAt`, and `derivedFrom` = the shipped plan's id when the source is shipped |
| **`copyPlan` → `clonePlan` is a deep copy: every `day.id` and every `ex.id` is preserved** | `logic.js:3440` | **The load-bearing fact of the whole order.** A copy does not orphan one logged set: history is keyed on the slot id (WO-014's central ruling), so a copy keeps every prior, every ghost, every sparkline and every verdict basis. It also keeps an in-progress draft's entry ids resolvable |
| `keyLifts`, `speedSource`, `reintroOrder`, `reducedWeeks` are fields on the document and are cloned | `logic.js:4040`–`4051` | SP1, V1, ST1 and D1 keep working on a copy. Nothing goes to its ABSENT state |
| `writePlan(store, plan)` refuses a shipped `planId`; `setActivePlan(store, id)` accepts any known id | `logic.js:3845`, `:3869` | The two store ops exist. Nothing new is needed below them |
| `buildSession(draft, dayId, date, id, planId, plan)` is called with **`sp().planId, sp()`** — the active plan **at save time** | `index.html:8485` | **A copy made before `Save session` changes what tonight's session records.** See §4 |
| `phatProvenanceReport` re-derives placement for a derived plan, and **PV1(b) fails a day holding `k:"power"` together with `k:"hyp"` or `k:"speed"`** | `logic.js:2981`–`2995` | A copy is coaching-identical **until the first edit**. The first edit can flip `phat` to `false`, which downgrades ST1's and D1's copy from the brief's assessed diagnosis to the generic one. **Not silence — a different sentence.** W1 owns whether that is acceptable |
| B-158 (WO-018) — `keyLifts` / `speedSource` / `reintroOrder` name slot ids and do not move when a slot is edited | backlog B-158 | **Not triggered here.** A copy moves nothing, this order adds nothing, and appending a slot (WO-023) moves nothing either. Stated so nobody blocks on it |
| Every store write re-reads the key and overlays (WO-013) | `logic.js` `save()` | A plans write from a session screen is already safe from the stale-tab class **if it goes through `save()`**. A hand-rolled write from this tab's memory is the B-76 defect and is criterion C5 |

---

## 2. Constraint check

- **§3.1 no build step** — one pure function, two store ops already present, one button. No conflict.
- **§3.2 offline-first** — the plan store is `localStorage`. A copy is made with the network off. Criterion.
- **§3.3 never lose a number** — the risk is *not* the new plan. It is (a) a plans-store write that
  overwrites another tab's plan and (b) a write that happens on the road to `Save session`. C1–C6.
- **§3.4 local dates** — `copyPlan` takes `todayStr`; it must be `PHAT.localDate()`, never
  `toISOString()`. Criterion C7.
- **§3.5 loads are kg** — untouched.
- **§3.6 ≥ 44 px** — one control, measured at 400 px with Playwright, not asserted.
- **§3.7 secrets** — none.
- **§3.8 `main` always deploys** — `main @ 4245d13` is production. Clean start, no undeployed lane.
- **Open P0s** — none. B-01 / B-02 / B-03 are closed.
- **Schema** — `SCHEMA_VERSION` stays **7**. A new plan document is a new element in an array the store
  already holds; `writePlan` stamps the version. **No migration. Zero bytes moved in the log store.**
- **Backup** — the plans store backs up through `save()`, and `mergeStores` unions plans by id with
  `activePlanId` treated as the device's own (`logic.js:7232`). A new plan reaches the server on the next
  push and does not change Diana's active plan. Criterion C8.

---

## 3. Work items

### W1 · Does a copy of a shipped plan still carry the shipped plan's coaching? — owner: `strength-coach`

Mandatory under `CLAUDE.md` §1: this reaches the stall detector, the deload check and `PROGRAM`.

Scope, in: three questions, answered in `docs/coach-audit-addendum.md`.

1. **Before any edit, is a copy coaching-identical to its source?** The PM's reading is yes and it is
   mechanical: `derivedFrom` is the shipped id, the four key lifts sit at the same ids in the same days,
   their `s/lo/hi` are unchanged, no day mixes kinds, five days hold something — so
   `phatProvenanceReport` returns `phat: true`. **Confirm or correct that reading**, in one sentence, so
   nobody re-derives it.
2. **What does the first edit cost?** Name which edits keep provenance and which break it. PV1(b) is the
   sharp one: appending a `hyp` slot to `d1` *Upper power* flips `phat` to `false`, and ST1 / D1 then
   speak the generic copy instead of the brief's. **Is that downgrade acceptable, and must he be told at
   the moment of the edit?** A yes needs the literal.
3. **Does the copy's name carry a coaching claim?** `copyPlan`'s default is `"PHAT — my version"`. A plan
   that says PHAT and is no longer PHAT-provenant is a label that lies — B-27's family.

Out: the added-movement prescription, `k` for a new slot, position in the day. Those are WO-023 W1.

Acceptance criteria:
- Each of the three answered in the addendum under a numbered section, each with a confidence tag.
- Question 2 is answered as a yes/no on disclosure, with the literal when yes.
- No new rule id unless the coach judges one is needed; if one is minted it is written as a rule with an
  id, not as prose.

Depends on: —

### W2 · The flow and the words for "this needs a plan you can edit" — owner: `ux-designer`

Scope, in: a new §22.21 of `docs/specs/wo-004-screens.md`, plus an in-place amendment to §22.7's
read-only row. Covering:

- §22.7's read-only branch (`index.html:4014`): the line `Today only. {plan} is read-only — duplicate it
  in Plans to keep a change.` is **replaced** by the real control plus the consequence.
- The confirmation states three facts before the tap, because all three surprise him later:
  (a) a copy is made and **becomes the plan you are on**; (b) nothing in your history moves — every set,
  every chart, every last-time number stays (true, §1); (c) the original stays, read-only, in Plans.
  Plus whatever W1 rules about provenance.
- The copy's **name**. **Recommendation: shown, not asked.** A text field between him and a plan change
  in a gym is a keyboard he does not want; renaming already lives in the Plan Editor.
- The failure state, in §2.2's refusal shape: `Could not make an editable copy. Nothing changed.`
- The undo. A copy-and-activate is one act and must be one undo.

Out: the added-movement offer (WO-023 W2). **Two UX agents must never be in `wo-004-screens.md` at
once** — this lane owns §22.21 and §22.7's read-only row, nothing else.

Acceptance criteria:
- §22.21 exists with every literal marked NEW; §22.7's read-only row is amended in place rather than
  contradicted from a second section.
- Every size given as a number at 393 px and at 400 px, ≥ 44 on both axes.
- The confirm carries all three facts in §22.7's three-sentence shape, and no string anywhere claims a
  set is on a chart — §22.16 #5 still binds.
- One sentence naming what the control does **not** do: it does not change today's session.

Depends on: — (parallel with W1; W1's answer lands as an amendment if it adds a line)

### W3 · `editableTarget` — one pure function — owner: `backend-engineer`

Scope, in: a new pure function in `logic.js`, exported on `window.PHAT`, no DOM, no globals, no clock:

```
editableTarget(store, todayStr) -> {ok, store, plan, created, problems}
```

- Resolves the active plan from the store through the existing resolver. Nothing else may hold a
  reference to a shipped plan by name (`logic.js:4673`).
- Active plan editable → `{ok:true, store: <untouched>, plan, created:false}`. **The no-op case must
  move zero bytes.**
- Active plan read-only → `copyPlan` → `writePlan` → `setActivePlan`, returning the new store, the copy
  and `created:true`.
- Any failure returns `ok:false`, the original store untouched, and `problems` as developer signals.

Out: writing to `localStorage` (the caller's job, through `save()`), any UI, any plan edit.

Acceptance criteria:
- Pure: called twice with the same arguments it returns equal values, and the input store is
  `JSON.stringify`-identical after the call. Asserted both ways.
- On an editable active plan: `created:false`, the returned store is byte-identical to the input, and no
  new plan appears in `store.plans`.
- On a read-only active plan: exactly one plan is added, `activePlanId` points at it, `readOnly:false`,
  `derivedFrom` is the shipped id, and **every `day.id` and every `ex.id` in the copy equals the
  source's, in the same order** — asserted element by element, never by length.
- `keyLifts`, `speedSource`, `reintroOrder`, `reducedWeeks` on the copy are deep-equal to the source's.
- `phatProvenance(copy) === phatProvenance(source)` for all five shipped plans. This is W1's reading
  pinned as a test; if W1 corrects the reading, the test states the corrected expectation.
- A store with a missing or unknown `activePlanId` returns `ok:false` and an untouched store.
- No `toISOString()` anywhere in the diff.

Depends on: W1 (for the provenance expectation only — the function may be written first and the
assertion stated last)

### W4 · Wire §22.7's dead control through it — owner: `frontend-engineer`

Scope, in: `index.html` only. The read-only branch at `:4014` gains the control W2 specifies; the tap
runs `PHAT.editableTarget`, persists through the existing `save()` path (read-before-write, WO-013), then
calls `setExerciseMovement` on the returned plan exactly as the editable branch does today. The 300 ms
arm (WO-001 §1F) applies — it is still the one control on that screen that changes something outside this
session.

Out: any new session-screen control; the added-movement offer; the Plan Editor.

Acceptance criteria:
- On his actual state (active plan read-only, one swapped entry on Summary), the control renders and the
  honest read-only line does not render beside it.
- Tapping it and confirming: a new plan exists, it is active, the slot's `mv` is the swapped movement,
  **the slot's id is unchanged**, and the toast is §22.7's.
- Tapping `Not now`, the scrim or Escape: `phat:v1:plans` is byte-identical.
- The whole flow completes with the network off.
- Measured at 400 px with Playwright: ≥ 44 px on both axes, not in a top corner.

Depends on: W2, W3

### W5 · Verify — owner: `qa-engineer`

Scope, in: the criteria below, regression tests in `tests.html` for W3, a browser pass for W4.

**Data criteria. None is optional.**

- **C1 · A copy never moves a logged set.** With his real export loaded: compute every verdict and every
  history read over every slot before the copy and after it. **Identical, number for number** — same
  shape as WO-014's unswapped differential hash. One changed verdict fails the order.
- **C2 · The no-op case moves zero bytes.** Active plan editable → `editableTarget` → `phat:v1:plans`
  byte-identical. Not "equivalent": identical.
- **C3 · The draft survives.** With three exercises' sets typed into an in-progress session and a swap
  pending, run the whole copy-and-activate flow: `phat:v1:draft` holds all three entries with every
  typed value, and a reload offers the draft back with all three intact; declining it discards the draft
  and the new plan stays.
- **C4 · A stale tab cannot eat the new plan.** Two tabs. Tab A makes the copy. Tab B, loaded before it
  and holding the old plans store in memory, saves a bodyweight entry and a plan rename. **The copy is
  still there and is still active.** This is the B-76 / B-128 class and it has bitten this repo twice.
- **C5 · The write goes through `save()`.** No `localStorage.setItem` and no direct store write on this
  tap's path.
- **C6 · The refusal is clean.** Force the plans write to fail: the refusal line renders,
  `phat:v1:plans` is byte-identical, and the session and the draft are untouched.
- **C7 · Local dates.** `createdAt` on the copy equals `PHAT.localDate()` at 23:30 local and at 00:30
  local on a machine in a non-UTC zone.
- **C8 · Backup round trip.** The copy pushes on the next save and pulls back on a merge-on-open, and the
  merge **adds nothing and removes nothing** on the device that made it. The other account's
  `activePlanId` is unchanged.
- **C9 · Suite.** `tests.html` green, zero skips, zero named failures, three meta-tripwires intact, no
  fixture writing a `phat:*` key. The count is read from the file and recorded.
- **C10 · One red-first proof.** W3's tests run against the pre-W3 `logic.js` from `git cat-file blob`
  and go red for the stated reason.
- **C11 · `rx` is unchanged by a copy.** See §4.

Depends on: W4

### W6 · Ship — owner: `release-engineer`

Scope, in: merge to `main`, the 61-file manual deploy per `docs/deploy.md`, byte-verify, and the `sw.js`
VERSION judgement by its own header rule (file list unchanged ⇒ no bump; **state the judgement, never
assume it**).

Out: `.vercelignore` and the GitHub App. `CLAUDE.md` §2 is explicit that §7 must not be run.

Acceptance criteria: `PASS 61/61` against production; live `/logic.js` contains `editableTarget`; a cold
offline reload renders; the deploy record is written into this order.

Depends on: W5

---

## 4. The one consequence this order rules rather than asks

**A copy made before `Save session` changes `session.planId` on the session being saved**, because
`finish()` passes `sp().planId, sp()` — the active plan at save time (`index.html:8485`). This is
reachable for WO-022 standalone: §22.7's control lives on Summary, before `Save session`.

**Ruled as far as the PM can rule it: correct, and not a defect.** `planId` records which plan document
the prescriptions were read from, and after the copy that document *is* the copy — whose prescriptions are
byte-identical to the shipped plan's, because `copyPlan` edits none of them. Rule PE1's `rx` stamping
therefore produces the same numbers either way.

So it is an acceptance criterion rather than a question:

- **C11 · `rx` is unchanged by a copy.** Save one session with the shipped plan active and one with a
  fresh copy active, from the same draft bytes. Every entry's `rx` is identical and `planId` is the only
  difference. If any `rx` differs, **stop and escalate** — that is a real defect and it is not this
  order's.

What is **not** ruled here, and belongs to WO-023: what happens when the copy is made **and edited** in
the same breath, which is exactly what a promote does.
