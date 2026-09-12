# WO-006 · The Plan Editor (W14 + W15), as it ships now

Author: `project-manager` · Date: 2026-09-11 · Base: `main @ 9b84d98` · Branch: `w14-w15-plans`
Status: **in progress — a build is already in flight.** This work order binds the criteria it is
measured against; it does not restart it.

---

## 0. Two process errors, owned on the record

**Error 1 — a closed decision was reopened without him.** WO-004 §"Needs from Chady" item 4 asked
*"Build the Plan Editor now (W14–W15), or defer it?"* with my recommendation to defer. Chady answered
**"build the Plan Editor now"** and that answer is in `docs/decisions.md` (2026-09-10, "Chady's four
calls on WO-004", item 3: *"The Plan Editor is IN this batch, against the PM's recommendation to
defer it. W14 and W15 stay."*). WO-005 §5 then wrote *"Restating WO-004's ruling for tonight,
unchanged: M3 is cut outright"* — citing my **recommendation** as if it were the **ruling**. It was
not. The ruling was his, it was the opposite, and WO-005 re-litigated it with him asleep. That was my
plan and my error.

**Error 2 — the correction bypassed the PM.** When Chady caught it, the main session dispatched
`frontend-engineer` on W14+W15 directly. CLAUDE.md §1 says every ask goes through the PM first, no
exceptions for small ones. Correcting a PM error by skipping the PM is a second error, not a remedy —
it is how a build starts with no binding criteria, which is the state this document exists to end.

**The rule, added to my process (also recorded in `docs/decisions.md`):**

> A "Needs from Chady" question that he has answered is **closed**. A later plan may not reopen it
> without (1) quoting his answer and (2) stating a new fact that did not exist when he gave it. "The
> PM recommended otherwise" is not a new fact — it was already on the table when he decided.
> Mechanically: before writing any cut line, grep `docs/decisions.md` for the item and cite the entry.

Both errors are filed as **B-69** so they are not lost when this file stops being read.

---

## 1. Ask

Bind the in-flight W14+W15 build to acceptance criteria that include what E-3 changed, add the
`hydrateDraft()` fix, name who verifies what, and say what closes it.

## 2. Reading of it

W14 (Plans list, switch, duplicate, build from empty) and W15 (the editor) as WO-004 specified them
and `docs/specs/wo-004-screens.md` §9 designed them, built on the data layer W2/W3 already shipped
(`copyPlan`, `renameExercise`, `addExercise`, `addDay`, `moveExercise`, `removeExercise`,
`validatePlan`, `normalisePlanStore`, the plan-scoped tables and their ABSENT states).

Three things are true now that were not when WO-004 was written, and each adds criteria:

1. **E-3 shipped.** `phat:v1:plans` is in `BACKED_UP` and goes over the wire through `save()`; a
   restore writes it back. So a plan edit is a backed-up write, and the restore path must treat plans
   as data it can destroy.
2. **The screens still read the shipped PHAT plan as a constant** (`PROGRAM = PHAT.PHAT_PLAN.days`,
   `finish()` stamps `PHAT_PLAN_ID`). W14 is not a list on top of working plumbing; it is the plumbing.
3. **`hydrateDraft()` drops entries whose exercise id is not in the day**, and the draft records no
   `planId`. Unreachable while there was one plan; a loss path the moment there are two.

**Assumptions I am making rather than stopping to ask** (override any of them and the work order
still stands — they are each one criterion):

- **Deleting a plan is out of scope.** It is in neither WO-004 W14's scope line nor UX §9.1. The
  W14 criterion about "a plan that is later deleted" is still binding, because a restore can bring
  down a plan store that lacks a plan the log references; it is met by name resolution, not by
  shipping a delete control.
- **`SAVE PLAN` and switching the active plan are refused while an unfinished session is on disk**,
  with one sentence: `Finish or discard the session in progress first.` Editing (the working copy)
  stays open. Reason: a session mid-way reads its prescription from the plan; letting the plan move
  under it is the mid-set reinterpretation QA is told to attack. Restore already refuses on the same
  condition (E-3), so this is the existing rule applied to a second writer, not a new one.
- **A name is not recorded on the entry at save time.** `exName` must stop returning raw ids, and a
  session whose exercise id is in no stored plan renders `Exercise no longer in any plan` (UX §9.1).
  Recording `n` per entry is the more durable answer; it touches `buildSession`'s key order, which
  E-3's byte-identical round trip asserts on. Filed as **B-72**, not built here.

## 3. Constraint & backlog check

- **§3.3 never lose a number** — this is the item most able to violate it: an editor that touches the
  plan that history is keyed by. Every data criterion below is that constraint applied.
- **§3.1 no build step / §3.2 offline-first** — the editor is `innerHTML` in `index.html` against
  `logic.js`; nothing new is loaded. Identical offline.
- **§3.6 44 px** — WO-004 W15 already flags this as where the prototype is worst (13–20 px).
- **§4b one writer on `index.html`** — `frontend-engineer` is in it now. W2 and W3 below also touch
  `index.html` and **wait for W1 to report**. Nobody else opens that file until then.
- Backlog: B-46/B-47 (identity) built and QA'd — this is what they were for. B-57 half done: this
  closes the UI half. B-05 (edit a saved session) is **not** in scope and gets worse with this item;
  WO-004 already raised it as the next work order. E-5 (multi-plan) closes with this. **No open P0
  blocks it.**

---

## 4. Work order

### W1 · Plans list + Plan Editor + `hydrateDraft` — owner: `frontend-engineer` (in flight)

**Scope in:** everything in WO-004 W14 and W15 and UX §9.1–§9.8, on top of the existing `logic.js`
plan API — no new engine. Specifically:

- The app reads `phat:v1:plans` at boot through `readRaw` (absent → PHAT active, nothing written;
  `error` → `blockWrites[PLANS]`, PHAT active, editor commits refused with the store notice).
- `PROGRAM` becomes the **active plan's** days; `finish()` stamps the active `planId` and passes the
  active plan document; `saveDraft` records `planId`.
- Plans list, `ACTIVE` badge, switch, `DUPLICATE` with `The copy keeps this plan's history. Both plans
  read and write the same exercise history.`, `+ BUILD FROM EMPTY`, the honest note verbatim, read-only
  PHAT (§9.3), `UNSAVED CHANGES` / `Cannot open` badges.
- Editor: rename plan/day/exercise, reorder days, change set counts and ranges, add exercise (form,
  §9.5, `k` and `implement` required), add day, delete exercise (confirm + undo), persisted working
  copy under its own key, `SAVE PLAN` atomic, `DISCARD CHANGES` confirmed.
- The four ABSENT lines (SP1/V1/ST1/D1) render **on the Plans screen only** — never on Train or
  Session — exactly as coach §8.4 places them.
- `hydrateDraft()` fix (criteria D8–D9).

**Scope out:** deleting a plan. Editing a saved session (B-05). Recording names on entries (B-72).
Any new `logic.js` engine. `restoreApply` (W2). Any change to `sync.js` or `sw.js` (W4).

**Acceptance criteria — data (all binding, all QA-attackable):**

- **D1 (WO-004 W15 #1, headline).** Log three sessions under a PHAT copy. Rename every exercise in
  the copy, reorder every day, change two set counts, save. Snapshot `lastFor`, `stallReport`,
  `speedLoad`, `e1rmByDate`, `liftDays` for every exercise id before and after: **byte-identical**.
  Not one `id`, `lift` or `dayId` changed in the stored plan; diff the store.
- **D2 (WO-004 W15 #2).** Delete an exercise with logged history: the confirmation names the count
  (`3 logged sessions keep their sets. This removes it from the plan only.`); `Undo` restores the
  object at its original index byte-for-byte; after a save without undo, `phat:v1:log` is
  byte-identical to before, and the sessions still show in Trend. **No path shortens the log.**
- **D3 (WO-004 W15 #3).** With five unsaved edits in the working copy: reload, then force-kill and
  relaunch, then navigate away via `‹ PLANS` and back. All three: the editor reopens with all five
  edits, the row reads `UNSAVED CHANGES`, and the stored plan is byte-identical to its last save.
  Never half-applied. `SAVE PLAN` is one `save(PLANS, …)` call, never two.
- **D4 (WO-004 W14 #1).** Log under PHAT, switch to a copy, log, switch back: `phat:v1:log` differs
  only by the appended session; every session resolves names, appears in Trend, is found by `lastFor`.
- **D5 (WO-004 W14 #2).** A session whose `planId` matches no stored plan, whose exercise id is in
  some plan: renders that plan's name. Whose id is in **no** plan: renders `Exercise no longer in any
  plan`. Never a raw id (`PHAT.exName`'s fallback is unacceptable here), never blank. Both tested.
- **D6 (E-3).** Saving a plan goes through `save()`: with a signed-in test account, the push fires
  after the local write returns (timer, no await), the server's `plans` row carries the edited
  document, and offline the save succeeds with zero requests and the next online push carries it.
- **D7 (E-3).** A plan store marked `demo:true` (W13b's future) never reaches the editor's commit
  path as a real plan: the editor refuses to save into a demo store and says so.
- **D8 (`hydrateDraft`).** Start a session, type `100 × 5` on exercise X, background. Remove X from
  the plan (via the working copy is enough — or switch the active plan). Resume: the `100 × 5` is on
  screen under X's name, flagged `Not in the plan any more`, and **is saved with the session**. The
  set count on Summary includes it. Zero entries dropped, by diffing the draft on disk against the
  resumed `S.draft`.
- **D9 (`hydrateDraft`).** A draft hydrates against the plan its own `planId` names, not the
  currently active plan. A pre-WO-006 draft with no `planId` hydrates against PHAT.
- **D10 (assumption, §2).** With an unfinished session on disk, `SAVE PLAN` and switching the active
  plan are refused with `Finish or discard the session in progress first.`; the working copy is
  intact; the draft is untouched.
- **D11.** The working copy's key is **not** in `BACKED_UP` and never goes over the wire. It is
  cleared only by `SAVE PLAN` (after the store write returns true) or a confirmed discard.

**Acceptance criteria — behaviour:**

- B1. Every editor control ≥ 44 × 44 at a true 400 px and at 200 % text, enumerated by
  `getBoundingClientRect`, zero exceptions. Nothing destructive in a top corner; `SAVE PLAN` is
  bottom, full width; `DISCARD CHANGES` last in the scroll.
- B2. `ADD` is refused naming the empty field while any of Name / Sets / Range / Type / Implement is
  unanswered; no path creates an exercise without `k` and `implement` (assert on the stored document).
- B3. Reordering days changes array order only; `dayId`, `wd` and every exercise `id` unchanged.
- B4. Deleting an exercise named by `speedSource`, `reintroOrder` or `keyLifts` drops the reference
  and the affected feature shows its coach §8.4 ABSENT line on the Plans screen and **nothing** on
  Train or Session.
- B5. No `reason` string from `logic.js` is ever rendered (grep the templates).
- B6. The honest note and the read-only PHAT copy ship verbatim from UX §9.1 / §9.3.
- B7. Every string that can carry user input (plan name, day name, exercise name, cue) passes
  through `esc()` — including inside `aria-label`s and the confirmation headline.
- B8. `scripts/offline-check.mjs` passes; `file://` boot at 400 px with zero console errors; the
  suite is `N / N / 0` per the count in `tests.html` (read the file, do not quote a number).

Depends on: — (in flight)

---

### W2 · Restore and the plan store — owner: `backend-engineer`

**Scope in:** `restoreApply` and `localEmpty()` in `index.html` (storage logic; the routing table
puts storage with backend), plus their `logic.js` pure halves if the B-20 extraction request from
E-3 QA is cheap to honour in passing.

**Scope out:** the editor, the list, `sync.js`, the server.

**Acceptance criteria:**

- R1. A restore onto a device holding a non-PHAT plan writes `phat:v1:recover:plans:<ts>` **before**
  `phat:v1:plans`, through `save()`, with the local store verbatim; if that copy cannot be written,
  nothing is replaced (the log and bw rule, extended).
- R2. A restore is refused while a plan working copy exists, with the same shape as the draft
  refusal, naming the plan.
- R3. A backup holding no plans leaves the local plan store untouched (already true; now asserted).
- R4. The restored plan store passes `normalisePlanStore` and `validatePlan` per plan before the
  write; a plan that fails renders `Cannot open` and is never repaired or dropped (UX §0.7).
- R5. `tests.html` gains the pure-half assertions; the seam order is measured once in the browser
  and cited in "Already proven".

Depends on: W1 reported (one writer on `index.html`).

---

### W3 · Coaching review of the editor — owner: `strength-coach`

**Scope in:** the rendered Plans screen and the add-exercise form, as built. Three questions, each
needing a signed `[Certain]`/`[Likely]` answer:

1. The helper line `Type decides which rule reads this exercise and how long you rest. Implement
   decides how loads are described.` — routed to you in UX §9.5 and never signed. Sign, amend, or
   strike.
2. The Type picker reads `POWER / HYPERTROPHY / SPEED`. Under your ruling that `k` is a routing tag
   and the day heading governs, does labelling a 6–10 skull crusher `POWER` on a form mislead him
   into re-tagging slots to match his intuition? If so, what does the picker say instead.
3. The ABSENT lines (SP1/V1/ST1/D1) as they render on the Plans screen after deleting a referenced
   exercise — placement per §8.4 (`in the plan screen only, never on Train or Session`), and whether
   the line appears **once**.

**Scope out:** re-ruling C7a/C7b, PE1, or any engine. Those are settled.

Depends on: W1 reported (needs the screen to exist).

---

### W4 · QA — owner: `qa-engineer`

**Scope in:** every criterion in W1, W2 and W3's outcome, at 400 px, offline, 200 % text. Then the
three named attacks, each with the observed result, not a summary:

- **Attack A — edit a plan with a session in progress.** Start Upper Power, log two sets, background.
  Open the editor on the active plan, delete that exercise, change another's set count, tap
  `SAVE PLAN`. Expected: refused (D10), draft byte-identical. Then discard the session, save the
  plan, resume nothing — expected no draft offered. Then the D8 route (edit the working copy while the
  draft exists, do NOT save, resume): the typed sets survive.
- **Attack B — delete an exercise with logged history.** D2 as written, plus: undo after a reload
  (the toast is gone — is the exercise gone from the working copy? state what happens), and delete +
  save + re-add an exercise with the same name (new id — assert Trend shows two lines, per C-6, and the
  old history is intact under the old id).
- **Attack C — kill mid-edit.** D3 as written, plus a kill **during** `SAVE PLAN` (throw from
  `save()` via the storage adapter): the stored plan is either the old document or the new one,
  never a third thing; the working copy survives; the refusal renders.
- **Restore attack.** With a user plan active and a draft of that plan's working copy: restore
  refuses (R2). Discard the copy, restore: `recover:plans:<ts>` holds the local plan verbatim (R1).
- The two meta-tests stay in force; zero expected failures; `scripts/offline-check.mjs` green.

Depends on: W1, W2, W3.

---

### W5 · Release — owner: `release-engineer`

**Scope in:** merge `w14-w15-plans` to `main` on QA pass; bump `sw.js` `VERSION` (the shell changed);
deploy **eleven files** per `docs/deploy.md` §2, team-scoped, from git blobs at the merge commit;
verify with `scripts/verify-deploy.sh` (every file 200 with the right content-type, `/logic.js`
real content, every manifest `src` present); confirm the live `index.html` contains the string
`Editing the plan is the easiest thing in this app to do instead of training.`

**Scope out:** git-linking Vercel (E-2, still recommended, still separate).

Depends on: W4 pass.

---

## 5. Sequence

```
W1 (in flight, sole writer on index.html)
  └─> W2 backend (restoreApply)  ─┐
  └─> W3 coach (rendered screen)  ├─> W4 QA ─> W5 release ─> PM closes
```

W2 and W3 run **in parallel** once W1 reports; W3 does not touch files and W2 is the only writer
on `index.html` at that point. If W3 amends copy, that is one string edit routed back to
`frontend-engineer` **before** W4 starts, not during it.

## 6. Risks

- **The design's own line is the risk register:** *"Editing the plan is the easiest thing in this
  app to do instead of training."* Five tools, zero sessions. What ships: the note verbatim on the
  Plans screen, PHAT read-only so the first tap is a decision to fork, and no plan delete. What goes
  in the wake-up / hand-back note, in this order: **"Log Upper Power today. The plan is editable;
  do not open the editor before the first session is logged."** The editor is not a reason to touch
  the plan; PHAT is already a good plan and the number that moves is sessions logged.
- **Data at risk:** `phat:v1:plans` (new: restore can overwrite it — W2), `phat:v1:draft` (the
  `hydrateDraft` drop — D8/D9), and the history keyed by exercise id (D1/D2 — the whole point of C-6).
  The log store itself gains no key and no write path.
- **Migration:** none. `SCHEMA_VERSION` stays 5. The draft gains an optional `planId` (absent means
  PHAT — same rule as sessions). The working-copy key is new and never backed up.
- **Regression surface:** `PROGRAM` becoming plan-derived touches every screen that reads it —
  Train, Session, Summary, Trend, `hydrateDraft`, `finish()`. QA walks all six routable screens, not
  just Plans.
- **B-05 gets worse.** Nine engines read history confidently and the editor lets him reinterpret it.
  Not in scope; already the next work order per WO-004 §Risks.
- **Two-way sync is not a thing.** Editing a plan on the phone and restoring from the server
  overwrites it; W2 makes that recoverable, not impossible. Restore is still replace-all.

## 7. Needs from Chady

- **Confirm or override D10** (plan save and plan switch refused while a session is unfinished).
  Default ships as stated; the alternative — a session snapshotting its plan at start — is more
  work and is the right answer only if he expects to edit mid-workout, which the honest note argues
  against.
- **Confirm plan deletion stays out.** If he wants it, it is a new item with its own typed
  confirmation, after this ships.
- `.claude/agents/project-manager.md` is configuration; the process rule in §0 is recorded in
  `docs/decisions.md` and quoted here. **Adding it to the agent file is his edit to make** (or the
  main session's, with his say-so) — a subagent does not amend its own definition on its own say-so.

## 8. What closes it

QA's W4 report with every criterion marked pass/fail against the observed behaviour, the three
attacks written up, `N / N / 0`, and `offline-check.mjs` green; W5's verify output; then PM sets
W14/W15 to `done` in `docs/backlog.md`, closes E-5 and B-57, and records the D10 outcome in
`docs/decisions.md`.

## 9. Dispatch list (for the main session)

**Dispatch exactly this, in this order, and nothing else.**

1. **Nobody new right now.** `frontend-engineer` is already on W1 on `w14-w15-plans`. Hand it this
   file's §4 W1 as the binding criteria (D1–D11, B1–B8) and the scope-out list. It reports; it does
   not merge.
2. **After W1 reports — in parallel:**
   - `backend-engineer` → W2, brief: *"`restoreApply` / `localEmpty()` in `index.html`: write
     `recover:plans:<ts>` before `phat:v1:plans`, refuse restore while a plan working copy exists,
     validate restored plans, assert R1–R5 in `tests.html`. You are the only writer on `index.html`.
     Named paths only when committing."*
   - `strength-coach` → W3, brief: *"Review the rendered Plans screen and add-exercise form on
     `w14-w15-plans`: sign or amend the helper line in UX §9.5, rule on the `POWER/HYPERTROPHY/SPEED`
     labels given `k` is a routing tag, and confirm the §8.4 ABSENT lines render once and only on the
     Plans screen. Tag confidence. Touch no files; return copy changes as exact strings."*
3. **If W3 returns string changes:** `frontend-engineer` applies them (one commit, named paths) before
   step 4.
4. `qa-engineer` → W4, brief: *"Verify WO-006 §4 W1 D1–D11 and B1–B8, W2 R1–R5, at 400 px offline
   and 200 %. Run Attacks A, B, C and the restore attack as written in §4 W4. Observed behaviour per
   criterion, not summaries. Suite `N / N / 0`, `offline-check.mjs` green. Do not close a criterion by
   deleting a test."*
5. `release-engineer` → W5, brief: *"On QA pass: merge `w14-w15-plans` to `main`, bump `sw.js`
   `VERSION`, deploy all eleven files per `docs/deploy.md` from the merge commit's blobs, run
   `scripts/verify-deploy.sh`, and confirm the live `index.html` carries the honest-note string. Report
   the deployment URL and the verify output."*
6. `project-manager` → close: update `docs/backlog.md` (W14/W15 → done, E-5 and B-57 closed, B-70/71
   closed, B-72 stays open), record D10's outcome in `docs/decisions.md`.
