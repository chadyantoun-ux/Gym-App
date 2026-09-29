# WO-014 — The exercise library, movement identity, the on-the-spot swap, and four more splits

**Status:** specified — 2026-09-28. No code written.
**Base:** `main @ 6a87a3a` (WO-013 merged). Suite on that commit: read `tests.html`.
**Owner of this document:** `project-manager`.

---

## 0. Ask

> "I don't want to stick to PHAT anymore. I want … a different kind of exercises built in the database
> where I can pick the exercise and the sets and the reps and customize the exercise as I would like."
> "While I'm training, sometimes I replace one exercise with another on the spot … I need to be quick
> and just click on something, search for another exercise and add it or replace the exercise with that."
> "Practically I want to keep the PHAT exercise and I want to add the push pull legs and the three days
> and the two days upper lower." — and, on the follow-up, **"yes, please build the other one."**

Four things, in his order of pain:

1. **A swap, mid-session, in two taps.** This costs him every session he trains. It is the ask.
2. **An exercise library** to swap *from*, and to build plans out of.
3. **Four more built-in splits** beside PHAT, all pickable, all editable after picking.
4. **Customisable sets and reps** — already shipped (WO-006 Plan Editor, `setExerciseTarget`). Nothing
   new is owed here; the library is what makes it useful, because today he can only customise slots
   PHAT already named.

---

## 1. The reading, and the thing I disagree with

### 1.1 The crux is real and it is live, twice

`lastFor(sessions, exId)` (`logic.js:1414`) walks `session.entries[exId]` backwards and returns the
first entry with a completed set. `exId` is the **plan slot id**. Every engine that judges his training
reads history through it: `lastFor`, `e1rmByDate`, `liftDays`, `speedLoad`, `d1Rows`, `painWindow`,
`stallReport`, `volumeTier`. Two consequences, both true today:

- **A swap in place poisons the slot.** He replaces the seated cable row with a machine row because the
  cable station is taken. The numbers land in `entries["d3c"]`. Next Thursday the card reads
  `Last 55 kg × 12` under the heading *Seated cable row*, and P1/H1 recommend off it. That is B-131's
  "correct arithmetic on a wrong fact" arriving by a second route — and unlike B-131 it will recur
  every time a machine is occupied, which is weekly.
- **A restructure orphans everything.** A PPL plan built from a library mints fresh slot ids
  (`addExercise` → `mintId(taken, "ex")`, `logic.js:2181`). His four logged sessions do not follow.
  `First time logged` on a bent-over row he has four sessions of.

### 1.2 I agree with the movement identity layer. I disagree with keying history on it.

**A movement identity layer — a stable, shared vocabulary of movements that a plan slot *references*
and a logged entry *records* — is right, and it is the correct foundation. Build it.**

**Re-keying `session.entries` from slot id to movement id is wrong. Do not do it.** Three reasons,
in descending order of what they cost:

1. **It reintroduces B-46, which this repo rejected outright.** The shipped plan has `d1h` skull
   crusher 3 × 6–10 on a power day and `d5i` skull crusher 3 × 12–15 on a hypertrophy day. Same
   movement, two prescriptions, **two histories on purpose** — WO-004 C-6 killed the design's
   name-keyed identity precisely because it collapsed those two into one. A movement-keyed `entries`
   collapses them again by a different key. On Monday's power card the ghost would show Friday's
   light high-rep set and P1 would recommend off it. Same class of wrong advice the movement layer
   exists to prevent. `d1a` / `d3a` (row: power and speed) and `d1c` / `d3b` (rack chin) have the
   same shape. This is not hypothetical: six of the 42 shipped slots pair up.
2. **It makes a destructive P0 migration out of a problem that needs no migration at all.** Re-keying
   means rewriting four real sessions on disk *and* four JSONB documents on the server, reversibly,
   byte-checked — for a benefit a disclosed read-side fallback delivers without touching one stored
   byte.
3. **It throws away the honest record.** The slot id says *where in his week the set happened*. The
   movement says *what he lifted*. Both are facts. Collapsing to one loses the other, and the loss is
   not recoverable.

### 1.3 The cheaper shape, which is also the more correct one

Three additive fields and one read-side rule. Nothing stored is rewritten.

| Where | Field | Meaning | Migration cost |
|---|---|---|---|
| plan slot | `mv` | the movement this slot **references** | stamp user plans from the shipped map; absent = unmapped, and unmapped is a supported state |
| logged entry | `mv` | the movement he **actually performed** | **none.** Absent reads as "the slot's `mv`", which is true of all four logged sessions |
| logged entry | `sw: 1` | it differed from the slot at log time — the `Swapped` mark | none; absent = not swapped |
| logged entry | `n` | display name, only for a movement added mid-session that no plan carries | none |

And one rule, which is where the whole thing pays off:

```
Rule MV1 (name provisional — strength-coach owns the content)
  lastFor(sessions, exId, mv) returns an entry ONLY IF the entry's movement is the
  slot's movement. An entry whose `mv` disagrees is skipped, not returned.
  An entry with no `mv` is the slot's movement by definition (pre-schema-7).

  When the slot's own history is empty, a FALLBACK read may return the most recent
  entry for the SAME `mv` under a DIFFERENT slot — and the card must say so, by name,
  in words. It is never silent and it is never merged into the slot's history.
  Which priors qualify (prescription compatibility, recency bound) is the coach's, W1.
```

That single rule solves both live consequences. The swap stops poisoning the slot, because the
poisoned entry carries a different `mv` and `lastFor` skips it. The restructure stops orphaning,
because his bent-over row history is findable by movement from a new slot in a new plan, disclosed.

**What this costs, stated honestly:** `lift` today is plan data — "read live off the plan, never
written into a session, and therefore re-groupable later without touching a logged number"
(`logic.js:1455`). Writing `mv` into the entry gives that property up for the entry's copy. That is
the correct trade and it is the point: *what he actually lifted* is a fact about the session, not a
fact about the plan, and a plan edit six months from now must not be able to rewrite it.

`lift` stays exactly as it is this release. `mv` lands beside it. Collapsing the two is a second
change riding a first and is filed (B-141), not built.

### 1.4 What I am saying no to

- **Trend grouping across plans by `mv`.** Real, wanted, out of scope. The foundation's job is to stop
  losing his history where he reads it — the session card. Filed as B-141.
- **Shipping upstream photographs for library exercises.** F1p's "Not enough data: the whole of this
  section" is binding. 800 movements and 24 eye-checked photo ids is the correct asymmetry. B-142.
- **A cheaper swap with no library** (he types the movement name free-text into `n`). Rejected: typing
  a name one-handed with chalky hands is slower than the problem, and a free-text name has no stable
  id, so it buys the mark and none of the history. Named here so it is not re-proposed.
- **Editing or deleting a saved session.** B-05 is still open and this order makes it *more* urgent,
  not less — a swap mis-tapped is now a second wrong fact with no correction path. It is the next
  order after this one. It is not folded in.

---

## 2. Constraint and backlog check

**Constraints (CLAUDE.md §3).** No conflict, with three things to build correctly rather than around:

- **§3.1 no build step.** The library ships as one generated static JSON, fetched like any asset. The
  generator (`scripts/make-library.mjs`) runs on a developer's machine like `make-photos.mjs`, is
  committed with its output, and is never on the path between him and a logged set. Same precedent,
  same rule.
- **§3.2 offline-first.** Search must return results with the network off. That means the library is
  **precached in `sw.js`**, which changes the shell file list, which is a **VERSION bump to `v7`** by
  the header rule. Non-negotiable, and W3 owns it.
- **§3.3 never lose a number.** The migration criteria in §3/W4 are the spine of this order.
- **§3.5 stored loads are kg.** Untouched. `w` and `ld` are not read or written by anything here.
- **§3.8 `main` always deploys.** Deploy becomes **61 files or nothing** (60 + `assets/exercises.json`).

**Backlog.**

- **No open P0 blocks this.** B-01 / B-02 / B-03 are done. The B-76 / B-123 / B-124 / B-128 stale-tab
  overwrite class — which *would* have blocked it, because this order writes to `plans` and `log` on
  the same taps — was closed by **WO-013, merged at `6a87a3a`**. This foundation is buildable this week
  and was not buildable last week. That is the sequencing fact worth knowing.
- **B-111 (`Swapped` mark) is answered and ships inside this order.** The coach recommended it in
  WO-010; his behaviour has now answered the yes/no. It is W4's `sw` field and W5's render.
- **B-131 is untouched by design.** His `d1b` 86 kg on a bodyweight slot and `d1d` 81 kg on a dumbbell
  slot stay exactly as logged. "ok" is not an answer and no rule in this order guesses their meaning.
  The migration must prove it did not touch them — criterion D2.
- **B-116 (warm-up sets) is still unanswered and this order makes it visible again.** If he ramps
  20 → 70 kg and then swaps, which movement do the warm-up sets belong to? Raise it once; do not block
  on it. The answer changes nothing in this order's data shape.
- **B-04 (importer) now owes schema 2–7.** Update the row; it is not built here.
- **B-05, B-121, B-133** all become more pointed once a swap exists. Named, not folded in.
- **WO-006 C-7 and addendum §8.4 C7a / C7b already solved the hard half of the templates.** A plan that
  declares no `keyLifts`, no `speedSource`, no `cut` and no provenance has named absent states and goes
  silent honestly. Four new templates do not need new silence machinery. They need the coach to decide
  what each one *declares*.

---

## 3. Work order

Two tracks. **Track A (foundation + swap) does not wait for anything.** **Track B (templates) does not
start until the coach answers the heavy-days question in T1, which needs Chady's answer first.**

---

### Track A — the library, movement identity, and the swap

**W1 · The library contract and the movement rules — owner: `strength-coach`**

Scope — in: six rulings, each written as a named rule in `docs/coach-audit-addendum.md` §22, in the
form the addendum already uses (Rule / Applies to / Inputs / Logic / Output copy / Not enough data).

1. **`implement` from `equipment`.** free-exercise-db carries `equipment` per exercise (`barbell`,
   `dumbbell`, `cable`, `machine`, `body only`, `bands`, `kettlebells`, `e-z curl bar`, `medicine ball`,
   `exercise ball`, `foam roll`, `other`, `null`). `PLAN_IMPLEMENTS` is the app's enum. Produce the
   **complete derivation table**, every upstream value mapped or explicitly refused. A value with no
   honest mapping must land somewhere the app can say so, not on a guess — Rules I1 and I2 read
   `implement` for the load word and the increment line, so a wrong mapping is wrong advice.
2. **`k` is never derived.** Confirm, and rule the two cases: (a) a **swap** — the new movement inherits
   the slot's `s`/`lo`/`hi`/`k` unchanged, because he replaced the apparatus, not the prescription;
   (b) a **fresh add to a plan** — `k` is asked for, as WO-006 B2 already refuses without it. State
   whether (a) needs a warning when the movement's character and the inherited `k` disagree (Rule K2
   already exists for a rep-range mismatch — say whether it fires here).
3. **A movement added mid-session has no prescription.** My recommendation, for confirmation or
   rejection: it logs freely, no `s`/`lo`/`hi` is asked for, and **every verdict is silent on it** with
   a named absent line in C7a's shape. Rationale: it is one improvised movement in one session, and a
   guessed prescription would turn it into a confident recommendation next week. If you disagree, give
   the copy.
4. **Rule MV1 — the fallback read.** §1.3 above states the shape. You own the content: when does
   another slot's history of the same movement count as this slot's prior? Prescription compatibility
   (the `d1h` / `d5i` case is the test — 3 × 6–10 power and 3 × 12–15 hyp must **not** cross), a
   recency bound if you want one (N4 is the precedent), and **the exact sentence the card prints when a
   prior comes from elsewhere.** It must name where it came from. Silence here is the defect.
5. **Photographs and cues for a library movement.** Confirm: a library movement outside the 24
   eye-checked ids is **cue-only, and has no cue**, so the *movement & cue* disclosure does not render
   at all (`hasFig(e.id)||cueFor(e.id)` already handles it). Confirm that F1p forbids shipping unchecked
   upstream frames at volume. If you want a subset promoted, name the ids and eye-check them — that is a
   separate item, not this one.
6. **Does the movement id change the `fig` map?** Today `fig` is on the slot and `assets/ex/map.json` is
   keyed by slot id; `d1a` and `d3a` both carry `Bent_Over_Barbell_Row`. Rule whether `fig` should move
   to the **movement** (which de-duplicates the map and is its natural home) or stay on the slot. Either
   is defensible; say which and why, because a future session will re-litigate it.

Out: the four templates' content (that is T1). Any exercise the library does not contain.

Acceptance criteria:
- Each of the six is a named rule in §22 with Logic stated so an engineer can transcribe it without
  interpretation, and a `[Certain]` / `[Likely]` / `[Opinion]` tag.
- The `implement` derivation table maps **every** distinct `equipment` value present at SHA
  `a859101d633a01c4a1a920d6a8ce41dabba0705f`, with the count of exercises behind each, and names every
  value it refuses.
- Rule MV1 is stated so that `d1h` (3 × 6–10, power) and `d5i` (3 × 12–15, hyp) provably do **not**
  cross, and the document says so by id.
- The card's fallback sentence is given as a literal string, in house voice, no exclamation marks.

Depends on: —

---

**W2 · The swap flow — owner: `ux-designer`**

Scope — in: `docs/specs/wo-004-screens.md` §22. The mid-workout swap, one-handed, chalky hands, the
machine is occupied and someone is waiting for the one he is on.

- The trigger on the session card: where it lives relative to the load chip and the first set row, and
  why that position does not push a set row below the fold at 393 × 852. The load chip
  (`index.html:3155`) is the precedent — a control above the inputs, fixed height from first paint, its
  text changing only on a tap inside a modal he opened.
- The search sheet: query, results, what a result row shows (name, equipment, primary muscle), and how
  results are ordered so the *likely* replacement is first. Ordering is the whole trick: he is replacing
  a machine row, so machine and cable back movements come first, not alphabetical. State the ordering as
  a rule an engineer can implement.
- **Replace** and **Add** — he asked for both, they are different outcomes, and they must not be one
  ambiguous button.
- The `Swapped` mark: where it renders on the session card, on Summary and on Trend. B-111's copy.
- The **"make it permanent"** offer: **on Summary, after the session, never mid-set.** Its copy must
  state the consequence — the slot keeps its id and its history, and the prior movement's entries under
  that slot stop being that slot's prior (they remain findable by movement).
- The card's line when a prior came from another slot (W1 item 4 gives the sentence; you place it).
- The line when a movement has no prescription (W1 item 3).
- What the app says when the library file failed to load. Offline-first means it is cached, but the very
  first launch after install is not.

Out: the Plan Editor's library picker (it reuses this sheet — note the reuse, do not respec it) and the
templates picker (T3).

Acceptance criteria:
- Tap count from "the machine is taken" to "the replacement movement is on screen with an empty first
  set row" is stated as a number in the spec and is **≤ 4**.
- Every new control is ≥ 44 px and none is in a top corner.
- The spec states the 393 × 852 fold consequence of the trigger's position, measured or reasoned, and no
  set row moves below the fold relative to `main @ 6a87a3a`.
- Replace and Add are distinguishable without reading more than three words.
- Every new string is given as a literal. No exclamation marks, no emoji, second person, imperative.

Depends on: — (runs in parallel with W1; W1 item 4's sentence lands as a placeholder and is reconciled
before W5.)

---

**W3 · Generate the library file — owner: `release-engineer`**

Scope — in: `scripts/make-library.mjs`, modelled on `scripts/make-photos.mjs`. Reads
`yuhonas/free-exercise-db` at the pinned SHA `a859101d633a01c4a1a920d6a8ce41dabba0705f` (Unlicense,
already committed for the photographs) and emits **one** generated file, `assets/exercises.json`, with a
`_` provenance header naming the generator, the source, the SHA, the licence and the fetch date — the
`assets/ex/manifest.json` shape exactly.

Per exercise emit only: `id` (upstream), `n` (name), `eq` (upstream `equipment`), `pm` (primary
muscles), `sm` (secondary muscles), `f` (force), `m` (mechanic), `lv` (level). **Do not emit
`instructions`** — the app never shows them, the coach's cues are the app's instruction layer, and they
are most of the bytes.

Also in: `sw.js` → **`v7`**, with `assets/exercises.json` in the REQUIRED shell list (not OPTIONAL — an
app that cannot search offline fails §3.2); the deploy list moves 60 → **61**;
`scripts/verify-deploy.sh` and `scripts/offline-check.mjs` updated to know about it; `docs/deploy.md`
updated.

Out: the file's *semantic* contract — which fields the app reads, and the search function. That is W4.
Any photo fetching.

Acceptance criteria:
- `assets/exercises.json` is byte-reproducible: running the generator twice at the pinned SHA produces
  an identical file, asserted by hash in the commit message.
- The emitted file is **≤ 200 KB on the wire**. If it exceeds that, stop and report the number before
  shipping — do **not** silently curate the set to fit.
- The header names the SHA and the licence, and the Unlicense text already in the repo covers it.
- `sh scripts/verify-deploy.sh` expects 61 files and fails when 60 are present.
- With the network off and a primed cache, a search returns results. Proven by
  `node scripts/offline-check.mjs`, extended to cover it.

Depends on: — (fully parallel with W1 and W2.)

---

**W4 · Movement identity, the swap's data shape, and schema 7 — owner: `backend-engineer`**

Scope — in, all in `logic.js`, all pure:

1. **The library reader and search.** `PHAT.libraryLoad(json)` → a validated index or a named refusal;
   `PHAT.librarySearch(index, query, opts)` → ordered results implementing W2's ordering rule. Pure
   functions of their arguments; no fetch, no DOM. The fetch is W5's.
2. **Movement ids.** `mv_<upstreamId>` for a library movement; minted from the plan namespace for a
   user-created one. **Record the reasoning** (§7 Decision 2): an upstream id looks name-derived but is
   not renameable *by us*, which is the property WO-004 C-6 actually protects. A library SHA bump is a
   migration, not an upgrade.
3. **`mv` on the plan slot.** `validatePlan` accepts it (optional, non-empty string, format-checked).
   `addExercise` accepts and stores it. New pure op **`setExerciseMovement(plan, exId, mv, n)`** — the
   "make it permanent" primitive. **It must not touch `id`** (WO-007's ruling: ids do not move).
   `PHAT_PLAN`'s 42 slots gain `mv`.
4. **`mv`, `sw`, `n` on the logged entry.** `buildSession` stamps `mv` on every entry from the draft or
   the plan (the same precedence shape `rx` already uses: the draft's own copy wins); `sw: 1` when the
   draft's `mv` differs from the slot's `mv` at log time; `n` only for a movement no plan carries.
   `validateEntry`, `validateDraft`, `saveDraft` and `hydrateDraft` carry all three **verbatim** — this
   is B-112's exact failure mode and it must not recur. `validateSessionDoc` accepts them.
5. **Schema 7 on its own gate constant `V_MV`,** never on `SCHEMA_VERSION`. The pass stamps `mv` onto
   **plan-store slots only**, from the shipped PHAT map, by slot id. **It moves zero bytes in the log
   store.** A slot the map does not name is left unmapped.
6. **Rule MV1.** `lastFor(sessions, exId, mv)` — third argument optional; absent, today's behaviour byte
   for byte. New `PHAT.priorFor(sessions, plan, exId)` → `{entry, from: "slot"|"movement", exId,
   dayName}` implementing W1 item 4, so the card can name where a fallback came from. **No existing
   engine's signature changes**; each takes the prior it is already handed.
7. **The swap's pure ops.** `swapDraftEntry(draft, exId, mv, n)` and `addDraftEntry(draft, mv, n)` — a
   new draft each time, the argument never mutated, and any typed sets under a replaced slot preserved
   and returned so the frontend can ask before discarding them.
8. **The SQL mirror.** `supabase/migrate-007-mv.sql`: `phat_validate_session_doc` accepts `mv`, `sw` and
   `n` on an entry with the same refusal sentences as the JS. Applied as a **separate submission** from
   any selftest — the Management API runs a submission as one transaction (the `rls-selftest.sql`
   lesson).

Out: any DOM. Any fetch. Trend's `mv` grouping (B-141). Collapsing `lift` into `mv` (B-141).

Acceptance criteria — behaviour:
- `lastFor(sessions, "d1h")` and `lastFor(sessions, "d5i")` return **different** entries on a fixture
  where both slots have history, before and after this change. A test asserts it by id.
- A session in which `d3c` was swapped to a machine row: next session's `lastFor` for `d3c` returns the
  most recent **cable row** entry and **not** the machine row. Asserted on a hand-built fixture.
- `priorFor` on a new slot in a new plan carrying `mv_Bent_Over_Barbell_Row`, with his four logged
  sessions in the store, returns the 22 Sep row entry with `from: "movement"` and names the source day.
- A plan slot with no `mv` renders and logs exactly as today; nothing refuses over its absence.
- Every existing `PHAT.*` function that takes an `exId` still accepts its current call and returns the
  same value it returns on `main @ 6a87a3a`.

Acceptance criteria — data (these are the ones that matter):
- **D1.** Load his real export (the WO-010 fixture, hash 1528318698, extended to the four sessions), run
  the schema-7 migration, serialise the log store: the output is **byte-identical** to the input except
  for `schemaVersion`. Asserted as a string comparison, not a deep-equal.
- **D2.** The two B-131 entries — `d1b` 86 kg and `d1d` 81 kg — are **byte-identical** before and after,
  asserted by id, individually, in their own named test. No rule added by this order reads them
  differently than `main @ 6a87a3a` does.
- **D3.** A draft holding two swapped entries and one added movement, with half-typed sets, survives a
  reload with `mv`, `sw`, `n`, `w`, `ld` and `r` all intact, and `phat:v1:draft` identical bar `savedAt`.
  The B-112 shape, re-run for the three new keys.
- **D4.** With three sets entered on a swapped exercise, reload the page: the draft is offered back with
  all three sets intact **and still attached to the swapped movement, not the slot's original**; and
  declining it discards the draft and leaves the log untouched.
- **D5.** The schema-7 migration pass is run twice: the second run moves zero bytes.
- **D6.** A plan store migrated to 7 and then loaded by code that only understands 6 still renders every
  slot and logs every set — `mv` is additive and ignorable.
- **D7.** A `recover:*` keep is written before the first migration that changes a non-empty plan store,
  and `diag.html` shows it.

Depends on: W1 (rules), W3 (the file's shape is W3's output; the reader is written against it).

---

**W5 · The swap on screen — owner: `frontend-engineer`**

Scope — in, all in `index.html`:

- W2's trigger, search sheet, Replace / Add, `Swapped` mark, fallback-prior line, no-prescription line.
- The library fetch: cached, offline-safe, injected the way `sync.js` is (after first render), and a
  named failure state when it is not there.
- `sessionCtx` must list an **added** movement as a screen. It already appends draft entries the day's
  plan does not carry, resolving them through `exAnywhere(k)` (`index.html:2707`) — an added library
  movement resolves through the entry's own `n` instead. That is the seam; use it, do not build a second
  one.
- Summary: the `Swapped` mark and the "make it permanent" offer, calling `setExerciseMovement`.
- The Plan Editor's add-exercise form gains the library picker (reusing the sheet), pre-filling `n` and
  `implement`, and still refusing `ADD` until `k` is answered (WO-006 B2 stands).

Out: templates (T3). Trend changes. Any change to the load chip, the set rows or the `ld` row — the
kg-direct row must stay `main`'s DOM byte for byte, as WO-010 D8 requires.

Acceptance criteria:
- At 400 px wide with the network off: replace an exercise, log three sets, save. The session on disk
  carries the new `mv`, `sw: 1`, and all three sets.
- The set rows' DOM on a kg-direct card is byte-identical to `main @ 6a87a3a`.
- The swap trigger is present from first paint at a fixed height; nothing on the card reflows when the
  sheet closes.
- Every new string goes through `esc()`. A library name containing `<` renders as text.
- With `assets/exercises.json` absent or unparseable, the session card renders normally, the swap
  trigger states why it cannot search, and **no set row is lost or blocked**.

Depends on: W2, W4.

---

**W6 · Verify — owner: `qa-engineer`**

Scope — in: a regression test for every acceptance criterion above, D1–D7 first. Plus:

- A **red-first proof** on Rule MV1: write the swap-poisoning test against `logic.js` at
  `main @ 6a87a3a` and confirm it fails, before the fix lands. This repo's standard since WO-005.
- Mutants against `lastFor`'s `mv` comparison, `priorFor`'s fallback gate, the `d1h` / `d5i` separation,
  and `buildSession`'s `sw` derivation.
- A two-tab attack: tab A swaps and saves while tab B holds a stale plan in memory. WO-013's overlay must
  hold; assert no store loses a key.
- The three meta-tripwires still pass (no named failure, no unexplained skip, no fixture writing a
  `phat:*` key).

Acceptance criteria:
- Suite green with zero expected failures; the count written into `docs/backlog.md`.
- D1–D7 each have a named test.
- The pre-fix red is recorded in `docs/decisions.md` with the commit it was run against.

Depends on: W5.

---

**W7 · Ship — owner: `release-engineer`**

Scope: merge, deploy **61 files**, byte-verify against `git cat-file blob`, confirm live `/logic.js`
carries `V_MV` and `SCHEMA_VERSION = 7`, confirm live `sw.js` is `v7`, apply `migrate-007-mv.sql` **as
its own submission and before the client deploy**, probe its refusal sentences, and do a cold offline
load with the library.

Acceptance criteria:
- 61 files byte-verified on the production origin.
- A cold **offline** load searches the library and returns a result.
- The Supabase validator refuses a malformed `mv` with the same sentence `logic.js` refuses it with,
  probed live.
- His four sessions are on the phone and on the server, unchanged, after the deploy — checked in
  `diag.html`, not inferred.

Depends on: W6.

---

### Track B — the four splits

**Gate: T1 does not start until Chady answers the heavy-days question (§6 Q1). T2 does not start until
Track A's W4 is merged, because every template slot declares an `mv`.**

**T1 · The four templates' content — owner: `strength-coach`**

Scope — in: `docs/coach-audit-addendum.md` §23. Four plan documents, signed off slot by slot the way
PHAT's 42 were, plus one ruling that governs all four.

**The ruling, first, and it gates the rest: on his 5-day split, may the PHAT rules point at Upper and
Lower as the heavy days?** He has asked for *Push · Pull · Legs · rest · Upper · rest · Lower*. If Upper
and Lower carry 3–5 on the compounds and Push / Pull / Legs carry 8–12, then `keyLifts`, `speedSource`,
the week-6 test (ST1) and the deload triggers (D1 T1/T2) all have subjects and survive. If not, C7a and
C7b take over and the 5-day goes silent on stalls, deloads and speed loads — honest, but a real loss of
the app's whole advice layer. **State what he keeps and what he loses under each reading, in his terms,
with the two answers side by side.** Do not pick for him if the coaching case is genuinely balanced; do
pick if it is not.

Then, per template, declare exactly this and nothing less:

| Field | Level | Note |
|---|---|---|
| `name`, `from` | plan | `from` names the source the way PHAT's does |
| `days[]` — `id`, `name`, `wd` | day | `wd` is the weekday hint; his 5-day's rest days are gaps in the cycle, not days in the document |
| per slot — `n`, `mv`, `s`, `lo`, `hi`, `k`, `implement`, `lift`, `cut?`, `cue?` | exercise | `mv` is a library id at the pinned SHA. `k` and `implement` are required (WO-006 C-7) |
| `keyLifts` (≤ 4), `speedSource`, `reintroOrder`, `reducedWeeks` | plan | **declare or deliberately omit.** An omission is a C7a absent state and must be a decision, not an oversight — say so per template |

The four:

1. **Push · Pull · Legs · rest · Upper · rest · Lower** — 5 training days on a 7-day cycle. His words,
   exact. The day names are his; the exercises, sets and reps are yours.
2. **Push · Pull · Legs** — 3 days.
3. **Upper · Lower** — 2 days.
4. **The standard bodybuilder split** — 5 days, one muscle group per day. He said *"the regular split
   that any bodybuilder does"*. The conventional reading is chest / back / shoulders / arms / legs.
   **This is the one with the loosest definition: you name the day order and the exercises. The work
   order deliberately does not invent them.** Flag in your section that one line of confirmation from
   him is worth asking for before it ships.

Out: the library's `implement` derivation (W1). Anything about PHAT's 42 slots, which do not move.

Acceptance criteria:
- The heavy-days ruling is a named rule with a `[Certain]` / `[Likely]` / `[Opinion]` tag and a
  two-column keep/lose table.
- Every slot in all four templates carries all nine required fields, transcribable without
  interpretation.
- Every `mv` resolves to a real exercise in `assets/exercises.json` at the pinned SHA, by id.
- Each template states, per plan-level table, whether it declares it and why — four explicit decisions
  per template, not silence.
- No slot carries a slash-name. Rule A1 is binding: two exercises in one slot is two histories.

Depends on: Chady's answer (§6 Q1). Not on Track A.

---

**T2 · Ship the templates as plan documents — owner: `backend-engineer`**

Scope: the four documents in `logic.js` beside `PHAT_PLAN`, `readOnly: true`, each frozen; the Plans
list reads them; `copyPlan` remains the route to editing, unchanged.

Acceptance criteria:
- `validatePlan` returns `ok` on all four, asserted per template.
- Slot and day ids across all five shipped plans are **globally distinct**, asserted by a test that
  collects and counts them. A collision would merge two plans' histories.
- Adding four read-only templates changes **zero** stored bytes on a device that ignores them all.
- Picking a template and copying it produces an editable plan whose exercise ids are preserved
  (`copyPlan`'s existing behaviour) and whose `planId` is new.

Depends on: T1, W4.

**T3 · The template picker — owner: `frontend-engineer`.** Depends on: T2, W2 (reuses the sheet).

**T4 · Verify — owner: `qa-engineer`.** Depends on: T3. Same D-criteria discipline: picking and copying
a template must not touch the log store, asserted byte for byte.

---

## 4. Sequence

```
Track A (start now, nothing blocks it)

  W1 coach ─┐
  W2 ux   ──┼──> W4 backend ──> W5 frontend ──> W6 QA ──> W7 release
  W3 rel  ─┘      (needs W1,W3)   (needs W2,W4)

Track B (starts on Chady's answer; T2 waits for W4 merged)

  [Chady Q1] ──> T1 coach ──> T2 backend ──> T3 frontend ──> T4 QA
```

**Parallel now:** W1, W2, W3 — three agents, three different files, no shared write. The main session
may dispatch all three together.

**Serial after:** W4 → W5 → W6 → W7. Each is one owner on `logic.js` / `index.html` in turn. Two
concurrent lanes on those two files is what CLAUDE.md §4b exists to prevent; the main session serialises
or uses separate worktrees, and names the branch in each brief.

**T1 may start the moment Chady answers**, in parallel with anything in Track A. T2 may not start until
W4 is merged.

**Ship Track A alone.** The swap is what costs him every session; the templates are what he wants next.
Do not hold the swap for four signed-off templates.

---

## 5. Risks

Leading with the migration, which is smaller than feared and is still the P0.

| Risk | Severity | Mitigation |
|---|---|---|
| **The plan-store migration corrupts or drops a plan.** It is the only store schema 7 writes to. | P0 | D5 (idempotent), D6 (forward-compatible), D7 (`recover:*` keep before the first non-empty write). `diag.html` shows the keep. WO-013's overlay means a stale tab cannot undo it. |
| **The log store is touched by accident.** The migration must move zero bytes there. | P0 | D1 asserts byte-identity as a **string comparison**. D2 pins the two B-131 entries individually, by id. |
| **A swap poisons a slot anyway**, because `lastFor` is called two-argument somewhere the audit missed. | P1, wrong advice | W6 enumerates every call site and asserts the count; a mutant that drops the `mv` comparison must die. |
| **B-46 reintroduced** if a later session "simplifies" MV1 into movement-keyed history. | P1 | The `d1h` / `d5i` test is named, permanent, and its comment says why it exists. Decision recorded in §7. |
| **The library SHA moves** and movement ids move with it. | P1 | The SHA is pinned in the generator, in the emitted header and in `docs/decisions.md`. A SHA bump is a migration, not an upgrade — written down, not assumed. |
| **`sw.js` v7 does not reach his phone.** v6's per-navigation refresh has one same-list deploy of evidence. This deploy **changes the file list**, which is the stronger case — but WO-012's phone-only check is still owed. | P1 | W7 does not close until he confirms the swap trigger is on his phone. Chady's action: one page close. |
| **The library pushes the shell past what iOS will cache**, breaking offline. | P1 | W3's ≤ 200 KB criterion, and `offline-check.mjs` extended. Report the number rather than curating to fit. |
| **A mis-tapped swap is unfixable.** B-05 is open. | P1, rising | Named. B-05 is the next order. "Make it permanent" lives on Summary, not mid-set, so the destructive half needs a deliberate tap after the work is done. |
| **Server rows** need no rewrite (entry keys are unconstrained by the SQL validator; `mv` / `sw` / `n` are additive) but the validator must accept them **before** a client that writes them pushes. | P1 | `migrate-007-mv.sql` is applied in W7 **before** the client deploy. Ordered explicitly. |
| **`mergeStores`** union-by-id, local-wins is unaffected: session ids do not change. | — | Asserted in W6 anyway; it is cheap and the assumption is load-bearing. |
| **Two copies of one shipped template share exercise ids**, therefore share history. Pre-existing `copyPlan` behaviour, newly reachable now there are five templates. | P3 | Filed as B-143. Not fixed here. |
| **B-116 warm-up sets** interacts: a ramp before a swap has an ambiguous owner. | P2 | Raised once, not blocking. The data shape is the same either way. |

---

## 6. Needs from Chady

**Q1 — blocks Track B only.** On your 5-day (Push · Pull · Legs · rest · Upper · rest · Lower): are
**Upper and Lower your heavy days** — 3–5 reps on the compounds — with Push, Pull and Legs carrying
8–12 volume work? Yes or no is enough. **Why it matters:** yes means the week-6 test, the stall detector,
the deload triggers and the speed-work loads all keep working on your new split, because they have four
lifts to point at. No means they go silent and say so, and the app stops telling you when you have
stalled. The coach will lay out both columns before you decide, but he needs your answer first.

**Q2 — one line, not blocking.** "The regular split that any bodybuilder does" — the coach will name it
as chest / back / shoulders / arms / legs unless you say otherwise. Confirm or correct when you see it.

**Q3 — still owed, unrelated to this order, still costing you.** B-131: your `d1b` 86 kg on a bodyweight
slot and `d1d` 81 kg on a dumbbell slot. Both stay exactly as logged and this order does not touch them.
Every verdict on those two slots is arithmetic on a fact the app has wrong until you say what those
numbers meant.

**Q4 — B-116, one sentence.** The five-set ramp 20 → 70 kg in your first session was read as prescribed
work by every engine. Warm-ups: logged, marked, or left out?

---

## 7. Decisions to record in `docs/decisions.md`

1. **History stays keyed on the slot id. Movement identity is additive.** Re-keying `entries` to a
   movement id reintroduces B-46's collapse (`d1h` / `d5i`), forces a destructive rewrite of four real
   sessions and four server documents, and buys nothing a disclosed read-side fallback does not. Rule
   MV1 is the read rule; `mv` on the entry is the fact.
2. **A movement id derived from a pinned upstream id does not violate WO-004 C-6.** C-6 forbids an id
   that *our* rename can move. An upstream id at a pinned SHA cannot be moved by a rename in this app. A
   SHA bump is therefore a migration, not an upgrade.
3. **`lift` and `mv` coexist this release.** `lift` is plan data and re-groupable; `mv` on an entry is a
   stored fact about the session. Collapsing them is filed (B-141), not built.
4. **The library ships whole, not curated.** The failure mode of a curated subset is "the one I need is
   missing", in the gym, with someone waiting. Curation is a search-*ordering* problem, and that is
   where W2 puts it.
5. **800 movements, 24 eye-checked photographs.** F1p's "not enough data is the whole of this section"
   binds. A library movement is cue-only and has no cue, so the disclosure does not render at all.

---

## 8. New backlog items

| ID | Item | Severity |
|---|---|---|
| B-136 | A swap in place writes another movement's numbers into the slot's history and the next verdict reads them as the slot's | P1 |
| B-137 | A plan rebuilt with new slot ids orphans existing history for the same movement | P1 |
| B-138 | No exercise library: the app can only log movements the active plan already names | P1 |
| B-139 | Four built-in splits beside PHAT, pickable and editable after picking | P2 |
| B-140 | Schema 7: `mv` on the plan slot, `mv` / `sw` / `n` on the logged entry, `V_MV`, the SQL mirror | P1 |
| B-141 | Trend groups by `lift` only; one movement under two plans charts as two lines. `lift` / `mv` not collapsed | P2 |
| B-142 | A library movement has no eye-checked photo and no coach cue, so the movement & cue disclosure does not render | P2, accepted |
| B-143 | Two copies of one shipped template share exercise ids and therefore share history | P3 |

**B-111 (`Swapped` mark) is answered and closes inside this order.** **B-04** now owes schema **2–7**.

---

## 9. Amendment — 2026-09-28, after W5. Two gaps, three items, and what blocks the deploy

Building Track A surfaced two requirements that are in the signed-off documents and not in the code,
plus three smaller items. Ruled here, in the order's own file, so nothing is re-litigated.

**The governing principle for every ruling below: nothing pins a string or a series that is about to
move.** W6's whole value is that its expectations are deliberate. Dispatching QA against a build that
is about to gain a verdict branch, a chart filter and three rewritten strings buys a pin that has to be
redone, and a second full pass over `logic.js` verdicts is the most expensive pass in this repo.

### 9.1 Gap 1 — Trend plots swapped entries on the original lift's line. **BLOCKS. In this order.**

`index.html:3938` calls `PHAT.e1rmByDate(S.sessions, id)` with no `mv`, so MV1.1's skip — which W4
built into the engine — never fires for the chart. UX §22.6 (1) and (2) specify both the exclusion and
its disclosure line; neither exists.

It blocks, for three reasons and not for the one that looks obvious:

1. **It is wrong advice on the screen whose only question is *is this working*.** A lighter machine row
   plotted on the Bent-over row sparkline draws a drop he never lifted, and the delta token above it
   prints that drop as a number with a sign. UX §22.6's own words: *"the one outcome that is not
   acceptable."*
2. **It is the one surface left inconsistent.** The card, the seed, ST1, SP1, D1 and `liftDays` all skip
   after W4. A chart that does not is not a missing feature — it is the app contradicting itself, and
   the chart is the one he will believe.
3. **It is cheap now and expensive later.** The engine already takes `mv`. Discovering it after three
   weeks of logged swaps means the line he has been reading was wrong the whole time, and there is no
   way to tell him which sessions moved.

**One correction that must land with it, or the engineer will transcribe the wrong predicate.** UX
§22.6 (1) says the sparkline excludes every entry marked `sw: 1`. **It must not.** MV1.1(a) is explicit
that `sw` is not consulted, and coach §22.4.6 promises that after *make it permanent* the swapped
entries **become** the slot's history and stay on the chart. Filtering on `sw` would delete them from
the line the moment he accepts the offer — the opposite of what the confirmation just told him. The
predicate is MV1.1's: an entry whose `effectiveMv` differs from the slot's `mv` is excluded, and a slot
with no `mv` excludes nothing. The count in the disclosure line is the number of **excluded sessions**,
not the number of swapped ones.

**Explicitly not excluded:** the `Recent sessions` list, its session count, tonnage, `volumeTier`,
`trainingWeeks` and `painWindow`. Coach §22.4.4's table is the list; a swapped session is a session he
trained.

### 9.2 Gap 2 — the swapped-card verdict sentence. **BLOCKS. In this order.**

Coach §22.4.5 gives two literals and §22.7 assigns both to W4. Neither landed. A swapped card falls to
H1.3a, `First time logged. This becomes your baseline.`

It is not merely a wrong-feeling sentence. **It is the app making a false claim about his history and
calling a swapped session a baseline** — on a lift with months behind it. This repo's standing rule is
that silence looks deliberate and the app never guesses which fact applies; H1.3a here is a guess
dressed as a reading. It is the same class as the duplicate `PROGRAM` and the diet screen with no day
type: correct code, wrong sentence, shipped for a while because nobody could see it.

**I uphold the frontend's refusal to write the sentence in the view.** One fact phrased in two places is
how B-66 happened. The sentence belongs beside `epochChanged`'s branch in `verdictHyp`
(`logic.js:7154`), which is the exact structural sibling: *the comparison to last week is not
available, and here is why.*

**No new coach pass is owed.** §22.4.5 is the sign-off, `[Certain]`, with both literals written out.
CLAUDE.md §5's coach requirement is satisfied by the document that already exists. Do not dispatch a
redundant coach item; do dispatch the coach if the ST1 half needs a sentence §22.4.5 does not give.

### 9.3 Item 3 — the *make it permanent* copy. **In this order, UX's pen.**

W5 appended `The next verdict reads your {new} sets.` to UX §22.7's two body lines, because coach
§22.4.6 is `[Certain]` that three facts must be carried and UX's copy carried two. **W5 was right to
notice and right to flag rather than settle it.** UX either adopts the sentence into §22.7 verbatim or
writes its own carrying the third fact; either way the spec and the code say the same thing before QA
pins it. The coach owns *which facts*; UX owns *the words*. Neither owns the other's half.

### 9.4 Item 4 — the added-movement copy redundancy. **In this order, UX's pen. Filed as B-149.**

The card prints the mark `Added today` and then a verdict beginning `Added today.`; Summary states the
same fact three times (`ADDED`, `Added during the session. No prescription.`, then `No prescription` +
`Added today. No sets or reps set, so no verdict…`). It is cosmetic, it is real, and it costs nothing
to fix while UX is already in the file for item 3. Rendering the coach's copy verbatim next to UX's
marks is the cause; the fix is UX deciding which surface owns the fact, not deleting a coach sentence.

### 9.5 Item 5 — the suite is conditionally red. **Fixed in this order, first, before anything is pinned.**

`B-30 / TW1 — "todayStr omitted falls back to today"` (`tests.html:2685`) builds a week from
`P.weekStart(P.localDate())` and asserts `1`. Early in the week two of its three seeded sessions are
future-dated, the future-date guard the test above it asserts does its job, and the assertion fails.
The suite is therefore **green or red depending on the day of the week**, and `main @ 6a87a3a` reads
939 / 940 / 1 today.

This is not a backlog item and it is not QA's convenience. **Every "suite green" claim in this repo —
WO-006 through WO-013, each one a release gate — was made on a day the clock happened to cooperate.**
W6's own acceptance criterion is "suite green with zero expected failures"; it cannot be met or even
honestly evaluated while the suite's colour is a function of the date. It is a one-line harness fix, it
touches no product code, and it goes first so that every red QA sees afterwards is a real red.

Filed as **B-146** so the class is on the record: a test that reads the real clock without pinning it is
a tripwire violation in spirit, and W6 reports whether there are others rather than fixing them.

### 9.6 The two open questions from this order

**The photograph slot on a swapped card — ship as built.** Coach F1L.2 forbids showing the slot's
authored pair on a movement he is not doing; it does not require the space to be empty, so this is a
hole, not a conflict. W5 has isolated the alternative (the movement name in large type) to one line.
Nobody has measured which reads better mid-set, it is reversible in one line, and it touches no number.
**It does not hold the deploy.** Filed as **B-147**, with the PM's recommendation on the row and
Chady's one-line answer owed.

**Heavy days (Q1) — Track B can start in exactly one form and no more.** The ruling Chady is being
asked to make needs an artefact he does not have: the two-column keep/lose table. That table is the
coach's, it is short, it writes only to `docs/coach-audit-addendum.md` §23, and it collides with no
file in Track A. **T1a (the table alone) may be dispatched at any time.** The four templates
themselves — all four, including PPL and Upper/Lower, whose plan-level declarations turn on the same
reading — wait for his answer, and T2 waits for W4 merged, as §3 already says.

**And the standing diagnosis, for the record.** Four logged sessions. The swap is the thing that costs
him a session every week; a fifth split he cannot pick yet is more tooling. **Track A ships first and
alone.** Do not let Track B's table become Track B's templates before the swap is on his phone.

### 9.7 The amended work items

**W6.0 · The clock-dependent test — owner: `qa-engineer`.** `tests.html` only. Pin `B-30 / TW1`'s last
assertion to a seed that cannot be future-dated on any day of the week, keeping what it tests (an
omitted `todayStr` falls back to today). Report whether any other test reads the real clock without
pinning it; **do not fix them in this commit.** Depends on: —

Acceptance criteria:
- `tests.html` on the branch is green with the clock forced to a Monday, a Sunday and a Wednesday, and
  the assertion still fails if `trainingWeeks` stops defaulting `todayStr`.
- The count after the fix is in the commit message.
- No product file is touched. `git diff --stat` names `tests.html` and nothing else.

**W8 · The copy reconciliation — owner: `ux-designer`.** `docs/specs/wo-004-screens.md` §22 only.
Three things: (a) rule on W5's third sentence in §22.7's confirmation body — adopt verbatim or rewrite,
carrying all three of coach §22.4.6's facts; (b) rule the added-movement redundancy (B-149) — decide
which surface owns the fact on the card and which on Summary, and strike the rest; (c) amend §22.6's
exclusion predicate from `sw: 1` to MV1.1's movement comparison, and rewrite the disclosure literal so
its count means *sessions this line leaves out*, not *swapped sessions*. Out: any new control, any
change to the sheet, anything in §22.1–§22.5. Depends on: —

Acceptance criteria:
- Every changed string is a literal in §22.12's table, marked `AMENDED`, with the string it replaces
  beside it, so W10 transcribes and QA pins without interpretation.
- §22.7's body carries all three facts, and §22.6 no longer contradicts coach §22.4.6 — the spec states
  in one sentence why `sw: 1` is the wrong predicate, so it is not re-proposed.
- The added-movement fact appears **once** on the card and **once** on Summary; the spec names which
  element carries it in each place and which is deleted.
- No string on a card that is neither swapped nor added changes. Stated explicitly in the section.

**W9 · The two engine gaps — owner: `backend-engineer`.** `logic.js` only, all pure.

1. Coach §22.4.5's H1 literal as a branch in `verdictHyp` beside `epochChanged` (`logic.js:7154`),
   reading a `swapped` fact threaded through `ctx` the way `pain`, `b` and `unit` already are — never
   re-derived from storage inside the engine. `Swapped to {new}. Not compared to last session.`
   H1 cases 1 and 2 still run; P1 is untouched (history-free).
2. Coach §22.4.5's ST1 variant — `Not enough unswapped sessions on {n} to judge. Log it weekly.` — when
   MV1.1's skip is what emptied a block. `stallReport` may gain a field; it may not change the shape any
   existing caller reads. **If surfacing that signal needs more than an additive field, stop and report
   the shape before building it** — the generic thin line is not false, only less informative, and a
   named fallback beats a refactor riding a copy fix.
3. The Trend exclusion's pure half: a count of the sessions MV1.1 excludes for a given `exId` and slot
   `mv`, so the view never re-implements the predicate. `e1rmByDate`'s existing return with no `mv`
   argument does not move.

Out: `painWindow`, tonnage, `volumeTier`, `trainingWeeks`, the `Recent sessions` list, any DOM, any
string UX owns. Depends on: —

Acceptance criteria:
- On a fixture where `d3c` holds a cable row on 18 Sep and a machine row on 25 Sep, the 25 Sep card's
  verdict is `Swapped to Machine row. Not compared to last session.` and **not** `First time logged.`,
  asserted as a literal.
- On the same fixture, every verdict on every **unswapped** card is byte-identical to `main @ 6a87a3a`,
  asserted as a string comparison over a generated sweep, not by eye.
- The exclusion count for `d3c` with the slot's `mv` is 1 before *make it permanent* and **0 after it**
  — the entry that carried `sw: 1` becomes the slot's history, exactly as §22.4.6's confirmation
  promised. A test asserts both, by id.
- `PHAT.e1rmByDate(sessions, exId)` called with two arguments returns what it returns on `b78439d`.
- **Data:** nothing in W9 writes. The log store is byte-identical before and after every function added
  here is called, asserted as a string comparison on his four-session export, with the two B-131
  entries pinned individually as D2 requires.

**W10 · The chart and the strings on screen — owner: `frontend-engineer`.** `index.html` only.
`liftPoints` passes each id's own slot `mv` to `e1rmByDate`; the disclosure line renders under an
affected sparkline from W9's count, in W8's amended literal; W8's rewritten strings replace W5's; the
`swapped` fact reaches `verdict`'s ctx from `cardMovement`, which already computes it. Out: the
`Recent sessions` list, `stallCard`'s copy, the load chip, the set rows, the `ld` row. Depends on:
W8, W9.

Acceptance criteria:
- With a swapped entry in the store, the affected sparkline has one fewer point than on `feb3f88`, the
  delta token above it recomputes from the remaining points, and the disclosure line renders beneath it
  in W8's literal with the right count.
- A lift with no swapped entry renders a sparkline, a delta and a footer byte-identical to
  `main @ 6a87a3a`. No line gains an empty element.
- The `Recent sessions` list and the session count are unchanged: a swapped session is still listed.
- At 400 px with the network off, the disclosure line wraps without pushing the next lift row off; every
  new string goes through `esc()`.
- **Data:** logging, saving and reloading a swapped session after this change still round-trips `mv`,
  `sw`, `n`, `w`, `ld` and `r` intact — D3 and D4 re-run, not assumed, because this item changes the
  ctx a card is rendered from.

**W6 · Verify — owner: `qa-engineer`.** Unchanged in §3, with three additions: the 24 moved pins are
re-pinned **one at a time, each with the reason it moved on its own line**, never in bulk; the Trend
exclusion gets a red-first proof against `feb3f88`; and a mutant that swaps W9's exclusion predicate
from the movement comparison to `sw: 1` **must die on the after-permanent fixture**. Depends on: W10.

**W7 · Ship — owner: `release-engineer`.** Unchanged in §3. Depends on: W6.

### 9.8 Amended sequence

```
  W6.0 qa      (tests.html) ─┐
  W8   ux      (spec)       ─┼──> W10 frontend ──> W6 QA ──> W7 release
  W9   backend (logic.js)   ─┘

  [now] ──> T1a coach (the keep/lose table only) ──> [Chady answers Q1] ──> T1 ──> T2 ──> T3 ──> T4
```

Three parallel: W6.0, W8 and W9 write `tests.html`, `docs/specs/wo-004-screens.md` and `logic.js` — no
shared file. W10 is alone in `index.html` afterwards. T1a writes only to
`docs/coach-audit-addendum.md` and collides with none of them.

### 9.9 Amended risks

| Risk | Severity | Mitigation |
|---|---|---|
| The chart exclusion is implemented on `sw: 1`, and *make it permanent* then deletes his own history from the line he was just promised it would stay on | P1, wrong advice and a broken promise | W9's after-permanent criterion (1 → 0) and W6's mutant. The predicate is stated twice, in §9.1 and in W8's spec amendment |
| The verdict branch changes a string on an unswapped card | P1 | W9's sweep criterion — every unswapped verdict byte-identical, string comparison |
| The 24 moved pins are re-pinned in bulk and a real change hides among them | P1 | W6's one-at-a-time rule, each with its reason on its own line. This is the whole reason the count was reported rather than absorbed |
| ST1's `unswapped` variant turns into a `stallReport` refactor riding a copy fix | P2 | W9's stop-and-report clause. The generic thin line is the named fallback |
| The deploy slips while three small items run | P2 | Three files, three owners, one round. The alternative is QA twice |
| B-147 (the empty photograph slot) is treated as a blocker | P3 | Ruled: it is not. It ships as built, and Chady's answer moves one line |

---

## 10. Second amendment — 2026-09-29. MV1 does not fire on the four sessions he has (B-152). **Blocks the deploy.**

Found by W9 (`9d4336b`) while proving its own change; **not introduced by it**. W9 was right not to fix it: the fix
lives in W4's function, not W9's, and every plausible shape trades against something this order fixed in place.

### 10.1 The defect

The v7 pass stamps **no `mv` on a logged entry** (`logic.js:4738`) — "the migration moves zero bytes in the log
store" was a hard acceptance criterion and the reason it was safe to ship. `effectiveMv(entry, slotMv)`
(`logic.js:1818`) then reads an entry with no `mv` as **the slot's movement**. On a swapped card the slot handed to
the engines is **shimmed to the swapped movement** — so a pre-schema-7 entry inherits a movement he never performed.

Proved and printed by W9 (`scratchpad/w9/proof2.mjs`): his **first swap on an existing lift** returns the old entry
as the prior and prints `Volume up 31% — 2,520 kg against 1,925 kg` **across two different movements**. `H1.3d`
cannot fire on that data either, because a prior *was* found — so §22.4.5's
`Swapped to {new}. Not compared to last session.`, which W9 has just built, is **unreachable on his real data**.

New sessions are clean. Only pre-deploy history is exposed, which is all four of his.

### 10.2 The ruling

**Fix the shim's basis, not `effectiveMv`'s meaning. It blocks the deploy.** Reasoning in full in
`docs/decisions.md` (2026-09-29, §4). In short: stamping `mv` in the migration breaks the zero-bytes criterion and
still misses an imported old export; disclosing it has nothing to detect from; accepting it leaves a fabricated
percentage on the first swap of every existing lift, and the swap is the ask.

`effectiveMv`'s inheritance rule is *true of the slot's **declared** movement* and *false of a shimmed one*. The
shim is a lie told to the engine. So the comparison takes **two** movements: an entry with no `mv` inherits the
slot's **declared** movement, and is skipped when that declared movement differs from the movement being compared
against. Where the two are equal — every unswapped path — the answer is byte-identical, so W9's 120,000-case sweep
still holds.

### 10.3 W11 · Close the legacy-`mv` hole — owner: `backend-engineer`

`logic.js` only, all pure. Scope: the movement comparison gains the slot's **declared** movement as an input, and
every MV1 site that today passes a possibly-shimmed movement passes both. `effectiveMv`'s two-argument contract does
not move; `mvSkips`'s three states (`undefined` = rule off, `null` = MV1.1(b), a movement = MV1.1(a)) do not move.
**Out:** the migration (no stored byte moves, in any store), `index.html`, any string, any prescription.

Acceptance criteria:

- On a fixture where `d3c` holds an entry **with no `mv`** on 18 Sep and the card is swapped to a different movement
  on 25 Sep, the 25 Sep card finds **no prior**, prints `Swapped to {new}. Not compared to last session.`, and
  **never** prints a volume percentage. The pre-fix output (`Volume up 31% — 2,520 kg against 1,925 kg`) is pinned
  red-first against `9d4336b` and shown to go green.
- On the same fixture with the slot's declared movement **equal** to the compared movement — i.e. not swapped — the
  prior, the verdict and every number are byte-identical to `9d4336b`. Asserted as a string comparison over W9's
  existing sweep, not by eye.
- A slot with no declared movement (`null`, MV1.1(b)) behaves exactly as it does on `9d4336b`: `sw === 1` is the
  only skip, and an entry with no `mv` is never skipped by this change.
- A two-argument call anywhere in `logic.js`, `index.html` or `tests.html` cannot tell the difference. Asserted:
  `git grep` the call sites and pin each unchanged.
- After *make it permanent* re-declares the slot's movement, the entries that carried `sw: 1` **are** the slot's
  history again — the §22.4.6 promise — and the exclusion count W9 returns still goes 1 → 0.
- **Data:** nothing in W11 writes. The log store is byte-identical before and after every function it touches is
  called, asserted on `CHADY_EXPORT` with `d1b` and `d1d` pinned individually (D2).

Depends on: — (parallel-safe with W10, which is `index.html`). **Blocks W6.**

### 10.4 W12 · The H1.3d gate — owner: `strength-coach`

`docs/coach-audit-addendum.md` only. **The gate, not the wording** — the string is `[Certain]` and untouched.
H1.3d fires only when no comparable prior exists, so a *second* session on the same swapped movement gets a real
comparison; §22.4.5 does not address the gate at all. Rule whether that is the intended coaching behaviour, and
whether a swapped card whose slot holds only pre-schema-7 history should say anything beyond §22.4.5's sentence.
Out: any new string that is not a sign-off on an existing one; anything about B-131 or B-150 (those are WO-015 and
WO-016). Depends on: —

Acceptance criteria:

- A one-line ruling on the gate, `[Certain]` / `[Likely]` / `[Guessing]` tagged, in §22, naming W11's behaviour as
  the thing signed off.
- If a sentence is owed that §22.4.5 does not give, it is written as a literal in §22.12's table so W11 or W10
  transcribes it without interpretation. If none is owed, that is stated in one sentence so it is not re-asked.

### 10.5 The evidence base, stated so it is not assumed

**Only one of his four sessions exists in this repo** (`tests.html:14101`, `CHADY_EXPORT`, 12 Sep, hash
1528318698). W9's data criterion was met against that one plus three synthetic documents. Any migration or repair —
this order's or WO-015's — needs his **real** export, and the only places all four exist are his phone and Supabase.
The procedure, owned by `release-engineer` and run before anything writes: pull the four `sessions` rows by REST for
his account, record `client_id`, `local_date` and `v_session_counts` for each, and cross-check against a phone
export if he sends one. **The fingerprint gate makes a mismatch a no-op rather than a corruption**, which is why the
missing three block the *claim of coverage*, not the build.

### 10.6 Amended sequence

```
  W9   backend  (landed 9d4336b) ─┐
  W11  backend  (logic.js)       ─┼──> W6 QA ──> W7 release
  W10  frontend (index.html)     ─┤
  W12  coach    (addendum)       ─┘
```

W11 and W10 are parallel: different files. W12 is parallel to both: it writes only the addendum. **W6 waits for all
three** — nothing pins a string or a series that is about to move, which is this amendment's governing principle as
much as the first one's.

### 10.7 What this amendment does not fold in

- **B-131's repair** (his two wrong loads on 12 Sep) — its own order, **WO-015**, after this one ships. Neither half
  depends on the swap schema any more; `d1b` is held on one more sentence from him.
- **B-150** (the load column means something other than the total on `bodyweight` and `db` slots) — its own order,
  **WO-016**, and it **outranks the repair**. It must not change `w`'s stored meaning, or WO-015's repair table is
  invalidated mid-flight.
- **Track B.** Still T1a only.

---

## 11. Third amendment — 2026-09-29. W6 passes; three findings ruled; **Track A is released to W7**

W6 landed as `3057e9e`: **977 / 977 / 0**, green on a Tuesday, a Monday, a Sunday and a Wednesday, zero skips,
three meta-tripwires intact, `git diff --stat` naming `tests.html` alone. It is the first count in this repo that
is not a function of the day of the week. The W5/W10 click lists — a criterion this order failed to write — are
being closed separately by QA and are **not** a condition of W7; nothing in them can change a pinned string or a
stored byte.

### 11.1 The evidence W6 rests on, and the one thing it does not cover

Three red-first proofs, each run against its own named pre-fix tree by swapping `logic.js` from
`git cat-file blob` under the same harness: the swapped verdict **red on `b78439d`** (11 fail), B-152 **red on
`9d4336b`** (3 fail), the Trend exclusion **red on `feb3f88`** (11 fail).

**The third carries a qualification that goes in the record and is not to be smoothed over.** The engine was
already correct at `feb3f88`; B-144 lived in the **caller** (`liftPoints` / `slotMvOf` in `index.html`), outside
the harness. The red on `feb3f88` is **the count**, and the chart was verified by reading plus one manual item.
**The suite does not cover the Trend screen.** That is structural — `index.html` has no harness — and it is why
`PHAT.liftSeries(sessions, plan, lift)` (the B-20 ask) stays open.

The stronger half: the unswapped differential — 16,128 verdicts and 169 history reads over all 42 slots — hashes to
**2038377080** on `main @ 6a87a3a`, `feb3f88`, `9d4336b` and the branch alike. Four movement-identity commits and
not one byte of advice moved on an unswapped card.

### 11.2 The fixture defect, and what W7 must expect because of it

`CHADY_STORE()` declared `schemaVersion: 5` while holding a schema-7 key — a shape no device can produce — and
`CHADY_SESSION()` is *built*, so it carried six `mv` keys his stored session does not. **Several migration and
merge tests would have passed on a migration that stamped `mv` onto his September entries**, which is precisely
what the zero-bytes criterion exists to prevent. `CHADY_SESSION_PRE7()` is now his real bytes with the old
fingerprint `588696318` re-asserted over it.

**Consequence, pinned and expected, and W7's brief must carry it:** a device that has just migrated 6 → 7 signs
differently from a server row still stamped 6, **so the first boot after the deploy pushes once.** One push per
device per store, on first boot. **The server row *count* must not move.** A second push, or a changed count, is a
defect and is not this.

### 11.3 The three findings, ruled

| Finding | Ruling | Where |
|---|---|---|
| `make it permanent` leaves `fig`, `cue` and `implement` behind | **B-153, P2. Does not block.** `implement` is the half with teeth (I1/I2/Z2); `fig`/`cue` are already suppressed on the shipped path by `shippedName()`, but incidentally — via the rename — not by rule. Coach rules the fix (derive / refuse / ask); PM recommends **derive** from `PHAT.libraryImplement` | `docs/decisions.md` Decision 15 |
| The Trend disclosure can over-count (entry vs scoring set) | **B-154, P3. Does not block.** QA is right that making them agree is a decision, not a bug fix. PM's sharpening: **the count is true, the reason clause is what can be wrong** — the fix may be a sentence, not a predicate. PM recommends counting only what the line could have plotted; the coach rules it under MV1.4 | `docs/decisions.md` Decision 16 |
| W10's unbriefed `!mvc.added` guard on the card's D8 line | **Accepted.** The identical guard with the identical justification was already on Summary; the card was the outlier, so W10 removed a B-66 shape rather than creating one, and the suppressed sentence is false in that state. Lands under the **truth-condition rule**: an engineer may delete a rendering of a sentence that is provably false and must report it; an engineer may not write, reword or choose among phrasings of a sentence that could be true. **Residue:** UX §22.9's table gains a D8 row — documentation, owed, not blocking | `docs/decisions.md` Decision 14 |

Two wall-clock budgets were **raised, not deleted** (S9 2000 → 60000 ms, S44 400 → 10000 ms) and now print the
measured number every run — a green tree measured 2076 ms and would have failed the old S9 budget. Ruled correct,
with the general rule, in Decision 13.

### 11.4 The release ruling

**Track A is ready for `release-engineer`. P2 does not hold it.** B-153 and B-154 are each reachable only past
behaviour Chady has never performed, each is a one-release exposure, and each is gated on a coaching answer nobody
has been asked for. B-152 blocked because it fired on his existing data on the first swap with no extra taps; that
is the line, and these are on the other side of it. Holding the deploy also means landing an unpinned change to
`setExerciseMovement`'s contract and a plan-store write path on the day 977 pins went green — §9's governing
principle has a corollary: **nothing moves after the pin either.**

**W7 ships as scoped in §3**, with the one addition in §11.2: 61 files or nothing, `sw.js` **v7**,
`migrate-007-mv.sql` as its own submission *before* the client deploy, his four real `sessions` rows pulled by REST
before WO-015 is dispatched, and **exactly one push per device per store on first boot with an unchanged server row
count.**

### 11.5 What this amendment does not do

- It does not plan Track B. Still **T1a only** until Chady answers Q1.
- It does not fold B-153 or B-154 into W7. Both are filed; neither is in scope for a release item.
- It does not close B-147 (nothing where the photograph was on a swapped card) — still ships as built, still
  Chady's one line.
- It does not amend UX §22.9. The D8 row is owed to `ux-designer` and is the only documentation debt this pass
  created.
