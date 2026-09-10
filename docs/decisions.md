# Decisions

Append-only. Newest last. One entry per durable decision so no session has to re-litigate it.
Format: date · decision · why · what it rules out.

---

### 2026-09-09 — All requests route through the `project-manager` agent
Chady's instruction. Every ask is decomposed into a work order with acceptance criteria and owners
before code is written.
**Rules out:** specialist agents self-assigning work, or the main session implementing directly from
a one-line ask.
**Caveat discovered:** subagents cannot reliably spawn subagents, so the PM plans and routes while the
main session dispatches. Documented in `CLAUDE.md` §1.

### 2026-09-09 — Seven agents, not five
Chady asked for PM, backend, frontend, QA, UX. Added two:
- `strength-coach` — the app dispenses training and nutrition advice. Code can be correct while the
  advice is wrong, and QA has no way to catch that. B-06, B-07 and B-08 are all exactly this class of
  bug and all three were in the first version.
- `release-engineer` — GitHub, Vercel, PWA, env vars and data durability are a distinct discipline
  from writing features, and three of the four epics are his.
A separate architect agent was considered and rejected: at this size the PM holds architecture.
Split it out if the roster ever exceeds one repo.
**Rules out:** asking the frontend agent to validate programming theory, or QA to own deploys.

### 2026-09-09 — Stack: GitHub → Vercel (static) → Supabase
Chady's choice of Supabase and Vercel, with a GitHub-linked Vercel account already in place.
**Why it fits:** a static single file deploys to Vercel with no build; Supabase gives Postgres, auth
and RLS without a server to operate; the anon key is safe in client code behind RLS.
**Rules out:** a bundler, a custom API server, and any flow where logging a set requires the network.

### 2026-09-09 — No build step, ever (while this stays one user's app)
Node is not installed on this machine; `gh`, `vercel` and `supabase` CLIs are not installed. GitHub
and Vercel are driven from their web dashboards, which is sufficient for static hosting. Dependencies
load from CDN as ESM.
**Rules out:** React/Vue/Svelte, npm dependencies, a test runner that needs Node — QA's harness is a
browser page (`tests.html`) instead.

### 2026-09-09 — Offline-first: localStorage is the source of truth during a workout
The gym has no signal. Supabase is sync and backup, not the write path.
**Rules out:** await-on-network before a set is considered logged; any spinner between tapping `+`
and seeing the number change.

### 2026-09-09 — Data loss is the only P0
Ordering principle for the backlog: fix B-01/B-02/B-03 before features, and before Supabase sync —
syncing data you know is malformed spreads the corruption to a second system.
**Rules out:** starting E-3 (Supabase) while the local model still drops sets.

### 2026-09-09 — `docs/context/handoff-brief.md` is the source of truth for programme and diet
Chady supplied the brief from the prior coaching conversation, along with `phat-log.xlsx` (the
spreadsheet that was chosen as the system of record) and the original `phat-tracker.html` (verified
byte-identical to our `index.html` apart from the HTML wrapper).
**Rules out:** inventing training or nutrition logic. Rest periods, the 65–70% speed-work figure, the
week-6 test, the calorie protocol and the weeks-1–4 volume cut all come from the brief, not from us.
Anything the app says that contradicts it is a defect.

### 2026-09-09 — Building this app contradicts the brief, and Chady overrode that deliberately
The brief's own decision table records **"Building a Supabase-backed web app — Rejected: solved
problem, weekend of work for no gain"** and **"Deploying to Vercel — Not pursued"**, with a standing
instruction to say so if the next request is another tool. That objection was put to Chady; he
reaffirmed GitHub, Supabase and Vercel and supplied a Vercel token.
**Decision:** proceed in full, and keep the standing diagnosis visible (CLAUDE.md §8) rather than
quietly dropping it. The brief's real point stands regardless of tooling: **zero training sessions
have been logged.** The measure of this project is a logged Upper Power session, not a green deploy.
**Rules out:** re-litigating the stack every session, and equally, pretending the tooling is the goal.

### 2026-09-09 — Vercel deployed by API, not yet git-linked
Project `gym-app`, live at `https://gym-app-psi-eight.vercel.app`, created and deployed through the
Vercel REST API because no CLI is installed. The Vercel GitHub App is **not** installed on
`chadyantoun-ux/Gym-App`, so pushes do not auto-deploy yet.
**Consequence:** `main` and the live site can drift. Until the GitHub App is installed, every release
is a manual API deploy and `release-engineer` must verify what is actually live.
**Note:** the token was pasted into a chat transcript and must be rotated.

### 2026-09-09 — Communication style is fixed by the brief
Lead with the uncomfortable answer; tag claims `[Certain]` / `[Likely]` / `[Guessing]`; disagree with
structure (because X, instead do Y, risk is Z); hold position under pushback absent new information.
**Rules out:** hedging, agreement openers, and presenting a coaching opinion as physiology.

### 2026-09-09 — Two files: `index.html` + `logic.js`
Chady approved the split. Pure logic (dates, validation, migration) moves to `logic.js`, a **classic
script** — not an ES module, because `tests.html` must open from `file://` where modules, `fetch` and
iframes all fail on an opaque origin. Both `index.html` and `tests.html` load it with `<script src>`.
**Why:** it is the only way to get automated tests with no Node and no server, which CLAUDE.md §5
requires. **Cost accepted:** a manual deploy now covers two files, and a partial upload is a black
screen — which is why E-2 (git-linking Vercel) was pulled forward.
**Rules out:** ES modules anywhere in this project, and testing by hand as the permanent answer.

### 2026-09-09 — `0 × 10` is a real set (B-21)
A bodyweight rack chin, an unweighted dip, a push-up. `done()` currently requires `+s.w>0` and
silently deletes these rows on save. Zero weight with reps is valid, complete data.
**Rules out:** treating weight as a required field. If a set is ever rejected, the app says so out
loud — it never deletes a row without a word.

### 2026-09-09 — A malformed set blocks the save
Not silent drop (that is B-02, the bug). Not save-and-flag — `vol()` and `topSet()` coerce `NaN` to 0,
so a flagged bad value silently poisons volume and trend maths.
**Load-bearing ordering:** blocking a save is only safe once the draft is persisted (W5 before W6).
Without it, refusing a save creates a *new* loss path if the phone dies while the user fixes a typo.
**Rules out:** shipping W6 before W5, under any schedule pressure.

### 2026-09-09 — The migration never rewrites a date
`YYYY-MM-DD` carries no offset, so the original local date of a UTC-stamped row is unrecoverable.
Shifting every row by a day would corrupt every row that was already correct. Instead: mark them
(`schemaVersion: 2`, `utcDatedBefore`, `dateBasis:"utc"`) and dedupe same-date bodyweight rows only.
Chady confirmed he has no logged data yet, so this is a no-op in practice — the property is kept
anyway because it is the whole point.
**Rules out:** any "fix up the old dates" migration, now or later.

### 2026-09-09 — `malformed` beats `incomplete` when a row is both
QA found a real ambiguity in the W2 classification: `{w:"7.5.0", r:""}` matches **both** `incomplete`
("exactly one field non-empty") and `malformed` ("a non-empty field that fails to parse"). `logic.js`
currently returns `incomplete`. Both block the save, so no data is ever at risk — but the copy differs,
and that is the whole point of the message.
**Ruling: `malformed` wins.** Telling the user to "finish this row" when the number they already typed
is garbage sends them to add reps to a broken weight. Naming the bad value is the useful answer.
**To apply:** `classifySet` checks parseability of every non-empty field *before* it checks
completeness. W6 shows the malformed token (`7.5.0`), not the "no reps" token, for this row.
**Rules out:** completeness-first classification, and any copy that implies the row is merely unfinished.

### 2026-09-09 — `tests.html` cannot cover the storage layer, and that gap is named not hidden
An iframe is dead on a `file://` opaque origin — QA verified the backend agent's `integration.html`
scores 1/1 failure without `--allow-file-access-from-files` and 61/61 with it. So the new storage
contracts (`loadDraft`'s none/ok/error statuses, `startDay` refusing to overwrite a corrupt draft,
`readRaw`, the verbatim `recover:log:<epoch>` copy, zero-writes-at-boot) are **not** covered by the
shipping harness, and a green `tests.html` must not be read as covering them.
**Two extractions will close most of it** (B-20, next batch): `PHAT.classifyDraftPayload(raw)` →
`{status, draft, reason}`, and `PHAT.buildSession(draft, dayId, dateStr, id)` returning the exact
object handed to `save()`. Until then, manual checklist items 12–15 cover them from the console.
**Rules out:** treating a green suite as proof the storage layer is safe, and shipping
`integration.html` as the test artifact — it needs a browser flag, so it stays a developer tool.

### 2026-09-09 — Out-of-range is `malformed` at the status level, `range` at the field level
A value that parses but breaks a limit (`600` kg, `0` reps, `101` reps) classifies as **`malformed`**,
not as a fifth `range` status. One blocking status, because the consequence is identical: it cannot be
saved. The distinction survives one level down as the per-field `reason`, which stays `"range"`, so W6
can say "above 500 kg" rather than "not a number" without branching on a second status.
**Accepted as proposed by `backend-engineer`.** It also matches the doc comment `logic.js` already
shipped with, so nothing in WO-001 needs re-ruling.
**Worth recording:** `-5` and `1e3` never reach the range check — the numeric pattern rejects them, and
`parseWeight("1e3")` returns no `value` property at all. `1000` is never computed, so it can never leak
into a saved set. Asserted twice.
**Rules out:** a fifth status, and any copy that calls an out-of-range number "not a number".

### 2026-09-09 — `buildSession` refuses rather than guessing a date
If no usable date is available (`dateStr` invalid and `draft.date` missing), `buildSession` returns
`null` instead of falling back to today. Stamping a session with a date nobody chose is a silent wrong
number, and the caller still holds the draft, so refusing loses nothing.
**Consequence for the rewiring:** `finish()` must guard the null and fail loudly. It must never call
`save(LOG, null)`.
**Rules out:** any "sensible default" date anywhere in the write path.

### 2026-09-09 — WO-001 merged and deployed
QA's W8 verdict: safe to put a real workout into. All four P0 loss paths (B-01, B-02, B-03, B-21)
closed and unreopenable; the same attack script still reproduces all four on the pre-fix build.
Merged to `main` and deployed by API — `index.html`, `logic.js` and `tests.html`, verified by fetching
`/logic.js` and requiring a 200 with `application/javascript` and real content.
**Two criteria were restated rather than met**, and this is the honest record: W5 said at most one
in-flight *keystroke* is at risk — it is one *field* (B-41); and W6 said `750` is unreachable from
`7.5.0` by any route — two deliberate backspaces reach it, though it can never be saved (B-42). Both
were overreach in the work order, not defects in the code.
**Two criteria remain genuinely unverified**: a real browser relaunch after a force-kill, and screen
reader announcement. Both are on the 17-item manual checklist, which is the thing that actually
settles this batch.
**Rules out:** treating WO-001 as proven before that checklist is run on the phone.

### 2026-09-09 — Chady is redesigning the visual language; frontend items are on hold
He said plainly the current design is not good enough and is working on a better one.
**Held:** every frontend implementation item in WO-003 — Weight tab, Trend tab, speed card, volume
tier UI, pain notice, rest timer, deload banner. Building eight screens against a design that is being
replaced is waste.
**Still running:** the logic. Calorie bands, stall detector, progression, speed load, volume tier
engine, deload triggers — all pure functions in `logic.js` with tests, all design-independent.
**Redirected, not killed:** the UX specs now lead with states, copy and constraints rather than visual
treatment, and each opens with "what a new visual design must still honour". Seven advice states are
seven advice states whatever the screen looks like.
**Carried into the new design as evidence, not opinion:** `--faint` on `--surface` is 2.30:1 and
`--red` is 2.84:1, both failing; and B-37 — at 400 px a set row is 369 px inside a 366 px content box,
so the last-session ghost text renders at zero width. The app's best idea has never been visible on a
phone; the redesign is the moment to fix it.
**Rules out:** implementing WO-003's frontend items before his design lands.

### 2026-09-09 — Rule G1: the hypertrophy load increase is 2.5% of load per rep above the range
`strength-coach` escalated rather than letting an engineer choose a multiplier. The audit's §9 gives
`Go to 42.5 kg` as H1 case 2 copy but states **no formula**, and 42.5 is not derivable from anything in
the document — P1 on the same numbers gives 32.5. G1 generalises P1 case 3's own 2.5%-per-rep constant,
reproduces the pinned SLDL `120 → 125 kg` exactly, and yields **35 kg** for the cable-row case.
**Accepted.** The WO-003 acceptance criterion is restated from 42.5 to 35.
**Rules out:** any load-increase multiplier chosen at implementation time. A number the app tells him
to put on a bar is a coaching decision, always.

### 2026-09-09 — Schema 3, and what it obliges
`SCHEMA_VERSION` is 3 on branch `wo-003-advice`: additive keys `reintro`, `lastReintroDate`,
`calChangedAt`, `deload`. No value rewritten, v1 and v2 both accepted, idempotent.
**Near-miss worth recording:** WO-001's `dateBasis:"utc"` marking pass was gated on
`logVer < SCHEMA_VERSION`. Bumping the constant would have re-run it over a v2 store and stamped
**correctly local-dated, post-WO-001 sessions as `"utc"`** — silently corrupting the provenance flag
every date window in this batch depends on. Now gated on its own `V_DATEBASIS` constant, with a test.
**Obligation:** WO-002's importer must accept `schemaVersion` **2 and 3**.
**Also decided:** an undateable session sorts **first**, never last and never dropped — a row with no
usable date must not be able to pose as the most recent one and drive a verdict.

### 2026-09-09 — Training weeks count distinct training DAYS, not saved sessions
`strength-coach`, `[Certain]`, framed as a counting error rather than a preference: three saves on one
date is one day of training. Counting them as three tells the app it has evidence it does not have,
and an inflated count unlocks accessory work early — the exact burial the weeks 1–4 block exists to
prevent. A re-save counts once; a genuine two-a-day also counts once, because `trainingWeeks` is a
proxy for weeks of *exposure*, and the three gates it feeds (volume tier, stall test, deload) ask how
long he has been training, not how much he did in a day.
**Added clause:** a session with no completed set is not a training day — a save carrying only a note
is not training. The note is still kept and shown; it is just not evidence. The converse holds too: a
session of nothing but 0 kg rack chins **does** qualify (Rule Z1).
**Extends to:** ST1's "two sessions of that lift per block" and D1's T1 "two consecutive sessions".
Otherwise one re-saved session unlocks a stall verdict, and a correction saved beside its original
reads as two consecutive failures.
**Rules out:** counting raw session records anywhere a rule reasons about training exposure.

### 2026-09-09 — The Monday-start week stands; no rolling window
Sun + Mon + Tue currently buys zero training weeks. Ruled to leave it: his programme is already
Monday-start (Mon/Tue/Thu/Fri/Sat, Sunday rest), so the straddle is only reachable by training
off-programme; a fixed grid can only ever **undercount** versus rolling, so every error runs in the
safe direction — the accessory offer is delayed, the stall test stays silent rather than accusing
early, and only D1's T3 backstop slips while T1 and T2 still fire on evidence; and a rolling count
needs greedily-packed disjoint blocks anchored on the first session, a number he cannot reproduce from
a calendar and which shifts whenever history is edited. A gate he cannot audit is a gate he will not
trust.
**Consequence for the redesign — load-bearing:** V1's line `Week 5 by the calendar, week 3 of real
training. Reduced volume holds.` must survive. If the two numbers can differ, the screen shows both or
the count simply looks broken.
**Rules out:** a rolling 7-day training-week count.

### 2026-09-09 — Advice evaluates on COMMIT, never on keystroke
`ux-designer` found two live-input bugs with the same root. Typing `12` into a reps field passes
through `1`, so a 3–5 rep exercise would print `Below the range. Drop to 95 kg.` mid-number. Typing
`painting` passes through `pain`, tripping the S1 suppression rule on a word that is not the keyword.
**Ruling:** verdicts and the pain notice evaluate on commit — blur or stepper tap — never on the
`input` event. This is distinct from B-24 (which gates on *completed sets*); both are required.
**Also ruled, same family:** nothing that appears or resizes may sit above an input on a card. The
verdict, pain notice and speed flag all render after the note field, so their reflow can only push the
*next* card, never the row under his thumb. And the verdict slot is held by a reminder line before a
verdict exists, so the card cannot grow when one appears — and the new silence does not read as
breakage.
**Rules out:** any advice computed from a partially-typed value.

### 2026-09-09 — Three engine dependencies the work order missed
`ux-designer` found these while specifying the states; all three are engine-side, so they bind even
while the frontend is on hold:
1. **`rollbackReintro` must return `{exId, name, date}`.** W14 returns nothing, so no UI can name the
   exercise in `Progress stalled. Pulling {ex} back out for now.` or know when to stop showing it.
2. **`endDeload(state, todayStr)` must exist.** W19 has no way out of a deload — and a deload renders
   two set rows, so without an exit he cannot log a third set he actually did.
3. **`calChangedAt` needs a clearer, not just W7's setter.** Otherwise one absent-minded tap silences
   calorie advice for seven days with no way back.
**To apply:** fold into the W7, W14 and W19 briefs at dispatch.

### 2026-09-09 — Two work-order conflicts, resolved without a planning round
- **W15 and W20 both print a week-7 line.** V1's status line and D1's cycle line would sit together
  showing two near-identical `Week 7 · … accessories back` strings. Resolved by precedence: V1's status
  line from week 5, D1's cycle line from week 6. Both engine-level criteria pass unchanged; W15's DOM
  criterion is restated.
- **W7 quotes a truncated string.** It gives `+0.34 kg per week. Above target, inside the margin.
  Change nothing.` where audit §2 ends with ` Recheck in 7 days.` The audit copy list is authoritative
  — Decision 5 was about a number and a name, not about dropping a sentence. W7/W8 assert substrings.
**Correction to the record:** `--red-hi` on `--bg` measures **5.4 : 1**, not the 8.0 : 1 logged during
WO-001. It still passes AA everywhere it is used, so no decision changes, but 8.0 should not be quoted.

### 2026-09-09 — W5/W6: seven calls the audit and the addendum do not cover

Implementing `PHAT.verdict` needed seven answers neither document gives. All are engine-level, all are
cheap to reverse, and the two marked **coach** should be confirmed before the batch ships.

1. **Rule I2's second line ships as `x2` on the verdict object.** The coach requires the increment line
   to be *"a second line below the verdict, never appended to the same sentence"*. Frontend is on hold,
   so the engine returns `{t, x, x2, rule}` and `paintVerdict` writes `x + "\n" + x2` into the existing
   slot, which gained one CSS declaration (`white-space:pre-line`). No new node, no new element, and
   the empty-verdict assertion still reads the same node.
2. **A pain note on H1 case 2 falls THROUGH to the comparison; it does not print a hold.** `[coach]`
   Audit §10 says "show the hold copy instead", but H1 has no hold copy — inventing one would have the
   app prescribe reps (`until all 3 sets reach 12 reps`), which §10 forbids in the same sentence. So a
   flagged hypertrophy exercise gets its factual comparison (`Reps up: 39 against 30 at bodyweight.`)
   and no load increase. P1's suppression is unchanged: cases 3 and 4 downgrade to case 5's hold copy.
3. **G1's 20% cap is rounded to the 2.5 grid, downward.** G1 caps the step at `0.20 × load` and leaves
   it unrounded; an unrounded cap can print an off-grid kg, which Decision 4 forbids. Rounding it
   changes nothing in any of G1's four worked examples and only ever binds downward.
4. **`round2p5` of unreadable input is `NaN`, not `0`.** A plausible wrong load is worse than a visibly
   broken one, and `0` would be laundered by `loadWord` into the word `bodyweight`.
5. **The 42 implement tags (Rule I1) landed here, with W6, not in W11.** Z2's copy is a function of the
   tag: without it the rack chin prints `zero load` instead of `bodyweight` and the B-32 acceptance
   string cannot be produced in the app. Data only — the ` · per DB` display half of W11 is untouched
   and still open. An untagged slot falls back to `zero load` and gets no increment line, so a missing
   tag can only ever cost a line, never a load.
6. **Z3 4b/4c copy is generalised through `loadWord`.** `[coach]` The coach wrote 4b for a bodyweight
   slot (`Bodyweight this time, loaded last time.`). A mis-logged 0 kg machine set renders
   `Zero load this time, loaded last time. Not comparable. New zero load baseline.` In 4c the baseline
   names the working load, except on a mixed session where that is 0, where it names the top weight —
   otherwise "added load" would print "at bodyweight".
7. **The speed branch is gated like every other and its text is unchanged.** W5's rule is literal:
   below `ex.s` completed sets, `PHAT.verdict` returns `null` for every `ex.k`. Speed cards keep their
   own hint paragraph meanwhile, and W12 replaces the branch with SP1 outright.
**Rules out:** any advice string built outside `logic.js`; any load token that bypasses `loadWord`.

### 2026-09-09 — CORRECTION: Node is installed. The no-build rule stands anyway, for better reasons
An early `command -v node` in git bash returned nothing and I recorded "Node is not installed" in
CLAUDE.md §3.1 and in `project-phat-stack-and-toolchain` memory as the *reason* for the no-build
constraint. That was a false negative — Node is at `C:\Program Files\nodejs`, **v24.14.1, npm 11.11.0**,
simply not on the git-bash `PATH`. Found by `backend-engineer`, who used it as a local syntax checker
and reported the discrepancy rather than quietly relying on it.
**The constraint is unchanged, but its justification is now honest:** the app is one file a phone opens
directly; it must run from `file://` and from static hosting with nothing between the source and the
screen; and a build step is one more thing that can break or be forgotten between him and a logged set.
**What this does unlock, if ever wanted:** `npm i -g` for the `gh`, `vercel` and `supabase` CLIs, which
would end the manual three-file API deploys. The browser test harness stays regardless — the app runs
in a browser, so that is where its tests belong.
**Rules out:** citing "Node isn't available" as a reason for anything. Verify a tool's absence with a
real path check before writing it down as a constraint.

### 2026-09-09 — The "no expected failures" rule is now enforced by the suite, not by memory
`qa-engineer` registered two meta-tests: one fails if any test name contains `currently failing`,
`known bad`, `expected failure` or `xfail`; one fails if anything is skipped without a stated reason.
**Why it matters:** the PM's original point was that a carried-forward expected failure turns "expect
exactly one failure" into a rule applied from memory, which is how a second, real failure gets waved
through. A rule enforced by the thing it governs cannot be forgotten.
**Also:** the B-32 KNOWN-BAD test was retired rather than deleted — split into a storage half (asserts
the exact JSON) and an advice half (asserts the ruled copy), because it pinned a string the coach has
since ruled against and would have failed the moment W6 produced the *correct* output.

### 2026-09-09 — Three findings routed rather than fixed
- **`workingLoad(sets, n)`'s `n` caps but does not require.** One completed set of three returns a
  load. Harmless today — `verdict()` gates before P1 asks — but it is a trap for W12, W14 and W19,
  which all read history and could take a confident load off a half-finished session. That is B-24
  re-entering through the back door. Pinned with the hazard named beside it; gate at each call site.
- **`e1rm(100, 1)` returns 103.3.** One rep at 100 kg is a 100 kg single. The code matches audit §4's
  `w*(1+r/30)` exactly, so this is the coach's to rule, not a defect. Harmless inside ST1 (both sides
  inflate, monotonicity holds) — it only bites if W9/W10 ever *displays* the number.
- **G1's 20% cap is loosely worded.** Taken literally it yields an off-grid load; `logic.js` rounds the
  cap to the 2.5 grid first and lands on 35, which is correct and conservative but a resolution the
  ruling's text does not state. Code is right; the wording wants one confirming line.

### 2026-09-10 — W7/W9: the two rules that were actively misadvising him are now correct
`calorieAdvice` replaces entry-count windows with **7 local calendar dates each**, minimum 5 dated
entries per window, and the audit's real bands. The shipping code contradicted the protocol in three
separate places at once: it cut 200 kcal above +0.35 where the brief says do nothing below +0.5,
triggered "add" below +0.2 where the brief says *flat*, and printed `Gaining too slowly` when he was
**losing weight**. `stallReport` replaces weight-only comparison with Epley over two rolling blocks,
counting **distinct dates** per lift per the coach's ruling.
**Three judgement calls worth keeping:**
- Gate order is history → window B → window A. It is reachable to hold 5 entries in each window on
  only 12 days of history, and the brief says weigh daily, run 14 days, *then* decide.
- Bands compare integer hundredths of the **rounded** rate, so the number he reads and the band he
  lands in can never disagree — `+0.5049` must not print `+0.50` and cut his food.
- A future-dated `calChangedAt` counts as an active cooldown. Clock skew must not open a window for a
  second calorie change; suppressing advice is the safe direction.
**Also:** `workingLoadStrict` added for the trap QA named — anything reading stored sessions uses it,
so a confident load can never come off a half-finished session. `workingLoad` is unchanged and now
carries a comment saying why.

### 2026-09-10 — B-35 was not as closed as I ruled it
I pinned `en-GB` to fix `Monday, Sep 7` → `Tuesday, 7 Sep`. That fixed the day/month **order** and I
recorded it as done. It does not fix the month **spelling**: on current ICU, `en-GB` short month is
**`Sept`**, so shipped `fmt()`/`dstr()` already render `7 Sept` on a modern device while the
coach-approved copy reads `Hold until 16 Sep`. W7's `dayMon` uses a fixed month table to match the
signed-off string, so the app now has two month formats in it.
**Filed as B-44.** One source of truth for month names, both formatters routed through it.
**Lesson worth keeping:** a locale is not a format. Pinning one fixes ordering and leaves spelling,
width and separators to the platform's ICU version, which changes under you.

### 2026-09-10 — DL1: the deload week recommended a load increase for obeying it
`strength-coach` §7, found while signing off two decisions that were each individually correct.
`deloadEx` makes squat `{s:2, lo:3, hi:3}`; he does `100×3, 100×3` exactly as prescribed; `verdictPower`
case 4 fires `Top of range on all 2 sets. Go to 102.5 kg next session.` **A load increase produced by
obedience, on every power slot of every deload week.**
Neither owner saw it because neither decision was wrong — scoping `hi − 2` to power days is right, and
gating the verdict on the deloaded set count is right. The defect lives in the seam.
**Rule DL1:** during an active deload a power slot returns one fixed line —
`Deload week. Stay at 100 kg. Nothing to add until full sets resume.`
**Rules out:** any progression verdict during a deload, by any path.
**Lesson:** two correct decisions can compose into a wrong output, and only someone reading the
*rendered advice* rather than the code will catch it. That is the whole argument for the coach agent.

### 2026-09-10 — E2: deload dates are not evidence
A deload set is the same weight two reps short, so on a 3–5 slot `100×3` vs `100×5` is e1RM 110.0
against 116.7 — **5.7% lower, more than twice ST1's 2.5% threshold.** Left alone, the app would print
`no progress … the sets aren't close enough to failure` two weeks after telling him to stop short:
B-07 re-created one layer up, by the app's own prescription.
Deload dates give ST1 no e1RM sample and no distinct date, and give T1 no row. **Deliberately not
applied** to SP1 (a deload does not lower the weight) or to `trainingWeeks` (it is still a week he
trained).

### 2026-09-10 — E1: an abandoned session breaks the streak
Backend and I both left `fail, abandoned, fail` reading as two consecutive failures. Coach rejected it:
"consecutive" means adjacent **in his training**, not adjacent among the dates the app can read.
`fail, abandoned, fail` → no trigger. `fail, abandoned, success` → no trigger. `fail, fail` → fires.
**Two reasons worth keeping:** with zero sessions logged and B-05 still open, the likeliest cause of a
half-logged date is a logging artifact, not a hard session. And the copy would say `Two sessions where
Squat went backwards` about a session he did not do.
The coach explicitly refused to add a "repeated abandonment" trigger. Also folds in a recency bound —
without it, six weeks of training, six months off, then two hard weeks back recommends a deload for
detraining.

### 2026-09-10 — One app, one vocabulary
The deload banner said `stalled` where ST1 says `no progress` for the same finding, on the same day,
about the same lifts. ST1's wording is fixed by the brief, so the banner moves to
`No progress on Row and DB press. Take a deload week: …`
**Rules out:** two words for one finding. Worth checking whenever a new surface describes an existing one.

### 2026-09-10 — E1 clause (c) is a WINDOWED best, not a recency gate on the all-time best
`backend-engineer`, implementing §7.6. The clause reads "the previously completed load used in the
FAIL test was completed within 41 days of the later failing date". Two readings, and they differ in
one case: he completed 125 kg a year ago and 120 kg ten days ago, then fails at 120 twice.
- Gate the all-time max on its own date → `best` is the stale 125, the clause fails, **no trigger.**
- Take the max over completions inside the 41-day window → `best` is 120, `120 <= 120`, **fires.**
Implemented as the second. The first would make T1 miss item 5's "cleanest regression signature there
is — a load he has demonstrated he owns, and he no longer owns it" precisely because he *also* has an
older, heavier PR, which is backwards. Both readings give the same answer to N4's headline case (six
weeks on, six months off, two hard weeks back → no trigger), which is what the clause was written for.
No number was invented: the window is `ST1_PRIOR_FROM`. **Open for the coach to overturn** — it is one
line in `bestWithin`.

### 2026-09-10 — DL1 made structurally unreachable, not merely correct
`verdictPower` and `verdictHyp` are unexported with exactly one call site each, both below an
unconditional `if (dl) return verdictDeload(ex, C);`. During an active deload no P1 case, no H1 case,
no I2 second line and no `g1Step` call is reachable at all.
Two more structural choices worth keeping:
- **`verdict` no longer trusts its caller.** `deload:true` makes it apply `deloadEx` itself, so the
  gate and the verdict are computed on the same object the card renders, whichever shape was passed.
  `deloadEx` is idempotent for this reason — without it, two call shapes would lower `hi` twice, which
  on a `lo:1, hi:5` slot changes the prescription.
- **`deloadEx` stamps `dl:1`, enumerable on purpose**, in the shape of `cut:1`, so a deloaded
  prescription survives `copyObj` and JSON and cannot launder itself clean. `deloadCheck` scans
  `keyLifts` before the T1 loop and returns `{trigger:null, reason:"deloaded-lifts"}` rather than
  answering off an `s = 2` ladder — a silent "no trigger" would have been the same class of defect as
  the bug it guards, so the refusal is named where a caller and a test can see it.
**Rules out:** relying on a comment to keep a deloaded prescription out of the evidence path.

### 2026-09-10 — The deload feature is engine-only and invisible on screen
`index.html:711` calls `PHAT.verdict({ex, sets, prev, note})` with no `deload`, and calls
`deloadCheck` / `deloadEx` / `stallReport` not at all. DL1 and E2 are correct in the engine and reach
nothing until the frontend passes `deload: PHAT.deloadStatus(S, today).active` and `stallReport(…, S)`.
That wiring is a frontend item, held for the redesign.
**Recorded so nobody reads "ten engines signed off" as "ten features shipped."**

### 2026-09-10 — One effective-end rule for a corrupt deload record
`deloadEndOf(startStr, endStr)` = `max(startDate, endDate)`, called by **both** consumers so they
cannot drift: `deloadStatus` (whose `last` feeds `since`, i.e. T2's freshness gate and T3's week count)
and `deloadWin` (E2's exclusion window). Coach's rider — the original fix protected E2's window but
left `last` unrepaired, which would make T2 fireable sooner and T3's count longer. Both eager, and
eager is the wrong direction for something the app only ever *recommends*.
A corrupt record can never report `active`: it always resolves through the ended branch, asserted
rather than assumed. The helper only narrows a window, never widens one.
**This is a read-time repair — it never rewrites `state.deload`**, so the stored bytes are untouched
and the original stamp stays inspectable. One exception, pre-existing: `startDeload` archives
`deloadStatus`'s derived dates onto `past`, so a superseded corrupt record is archived repaired. That
is a deload stamp, not a logged set.

### 2026-09-10 — A `reason` is a developer signal, never copy
`deloadCheck`'s `reason` (`"deloaded-lifts"`, `"early"`, `"active"`) must **never** be rendered.
`[Certain]` from the coach: it is a signal about a caller bug, not a fact about his training, and there
is no honest sentence to print for it. On every non-trigger path `text`, `x2` and `lifts` are empty and
`rollback` is false, asserted — so the engine emits no string to leak.
**Therefore this is a frontend constraint, and it belongs in the "what a new visual design must still
honour" section**: the UI may never render a `reason` field, and no banner appears at `deloaded-lifts`
any more than at `early`. To be added to the UX specs when the frontend items come off hold.

### 2026-09-10 — A test fixture shape worth watching
Several E1 tests must seed **below T3's nine-week backstop**, or a stale `fail, fail` pair returns null
from T1, falls through, and the suite asserts against T3 while believing it is reading T1. The failing
dates' spacing interacts with that seed. Backend hit exactly this and read the red correctly as a
fixture precondition rather than a defect.
**Rules out:** debugging a T1 red without first checking `trainingWeeks` against `DELOAD.backstop`.

### 2026-09-10 — WO-003's signatures for three engines could not be met as written
`volumeTier` and `deloadCheck` take a context object because the work order's positional lists cannot
satisfy their own acceptance criteria — `volumeTier` needs the day's exercises, every day's cut count,
the offered exercise's name and the current draft; `deloadCheck` cannot evaluate T1 without each key
lift's `s` and `lo`. And `stallReport` takes a fourth argument, `state`, which Rule E2 requires and
which **no document specifies**.
The code is right and the work order is stale. Every ST1 call in the suite goes through one adapter
(`ST1CALL`) so a different choice is a one-line edit.
**To apply:** PM restates W9/W14/W19's signatures rather than anyone "fixing" the code back.
**Rules out:** treating a work-order signature as authoritative over an implementation that met the
criteria the signature could not.

### 2026-09-10 — A survived mutant that was not a coverage hole
QA injected 13 regressions; 12 died. The survivor — removing `d1T1`'s `!r.evaluable` guard — changed
nothing because a SHORT row always has `failLoad === null` and the very next branch resets the run
identically. QA proved the two branches behaviourally equivalent, confirmed the *semantic* revert
(moving the null check above row creation, i.e. the pre-ruling code) IS caught by the E1 headline test,
and reported it rather than adding a test that would have pinned dead code.
**Worth keeping as a standard:** a surviving mutant is a question, not a verdict. Diagnose it before
adding a test to make it go away — the fix for an equivalent mutant is a note, not an assertion.

### 2026-09-10 — Test-fixture hazard in the deload suite
Seeding a stale date into the D1 background can complete a third distinct date in an old week, push
`trainingWeeks` to 9, and answer **T3** while the test believes it is reading T1. It bit both QA and
backend once each. The background now uses one-day weeks for the old range, and every T1 recency test
asserts `trainingWeeks < DELOAD.backstop` before asserting `null`.
**Rules out:** debugging a T1 red without first checking the seed against T3's backstop.

### 2026-09-10 — A deload resets T1's evidence. Confirmed, and the question was framed wrong
I asked whether a failure before a deload and one after it are a pair — i.e. whether the earlier
failure is still evidence. `strength-coach` `[Certain]`: that is not the question. **T1's only output
is "take a deload week."** So what matters is whether the right prescription for failing *after* a
deload is **another deload**. It is not. Repeating an intervention that has just demonstrably failed is
not coaching, and firing the same banner nine days after he took the last one teaches him the banner
means nothing.
**My stronger argument — that the app goes quiet when the problem is most real — was wrong on the
facts.** It does not go quiet: P1 case 1 fires on the card that day with a number
(`2 reps at 120 kg. Below the range. Drop to 115 kg next session.`), ST1 is not gated on `since` so the
Trend tab still reports the stall, and T2/T3 still run — T2 on a window entirely post-deload, so a
second deload three weeks later off three weeks of fresh stalling is defensible where nine days later
off the weeks that caused the first is not.
**The whole cost of reset is that T1 surfaces one session later. The cost of no-reset is a wrong
prescription delivered with confidence.**
**Keep E2 anyway**, even though `since` cuts those dates first and makes E2-inside-T1 near-unreachable:
it is the guard that survives any future change to `since`, and the only one that acts when a window
sits in `state.deload.past` with no current record. Belt to `since`'s braces, at no cost.
**Gap named and deliberately left open — B-45.** `fail → deload → fail` is a distinct state with no
honest sentence yet. Not written now: it is a new user-facing claim at the edge of what this app may
say, and it wants real history behind it first.

### 2026-09-10 — Chady's four calls on WO-004
1. **The handoff brief is the programme; the design's plan is a mock-up.** The prototype reclassifies
   9 slots from `power` to `hyp` (d1c, d1f, d1g, d1h, d2b, d2c, d2e, d2f, d2g) — changing both which
   rule fires and which rest applies — and drops two exercise alternates. Not adopted.
   `strength-coach` still adjudicates the table in W1, but the default is the brief.
2. **The movement diagrams are being replaced, not kept and not placeheld.** Chady: *"diagrams are
   very bad, we need better ones."* So the 15 hand-built SVG stick figures are out on quality grounds,
   and shipping the design's empty placeholder slots is not the answer either. **New work: source or
   generate real movement illustrations.** Constraints that bind whatever we produce: no build step,
   no CDN (offline-first), 42 exercise slots mapping to ~15 movement patterns, must read at ~64 px on
   a dark ground, and the per-exercise form cue text stays regardless of the artwork.
3. **The Plan Editor is IN this batch**, against the PM's recommendation to defer it. W14 and W15 stay.
4. **WO-002 (the backup round trip) lands after M1** — once the session screen works end to end and
   before the Trend/Weight/Diet screens. The importer owes schema 2, 3 and 4.

### 2026-09-10 — The design restates three bugs we had already fixed
Not a criticism of the design — a visual prototype restating behaviour from an older build is exactly
what happens, and it is why the engines are the source of truth and the design supplies the slot, not
the sentence. Recorded because the same thing will happen on the next design pass:
- The calorie decision is **B-06 verbatim** — last 7 *entries*, bands `0.2–0.35 correct / >0.5 cut /
  <0.15 add`, firing from two entries.
- The verdict gate is `min(ex.s, sets.length)`, so removing two sets fires a verdict on one — **B-24
  through a new door**.
- `− REMOVE` pops the last row unconditionally, including a completed `120 × 5`, with no confirmation
  and no undo.
Plus two new P0-class ones: `SWITCH TO AN EMPTY LOG` is one-tap history deletion, and demo sessions are
byte-identical to real ones, so sample data would drive a real stall report.
**Rules out:** taking behaviour from a design prototype. Take the flow and the pixels; the rules come
from `logic.js`.

### 2026-09-10 — CORRECTION: 8 reclassified slots, not 9. Our own work order was wrong
WO-004 §W1 and B-55 both listed `d2b` hack squat among the design's `power` → `hyp` reclassifications.
`PHAT App.dc.html:471` has it as `power`. The work order conflated it with `d4b`, the Lower-hypertrophy
hack squat, which is `hyp` in both files.
**Why this one matters more than the count:** an engineer transcribing the work order rather than
reading the source would have flipped a slot — **a programme change originating in a bug report.**
Found by `strength-coach` because it read the design file instead of trusting the brief it was given.
**Rules out:** transcribing a list of source facts from a work order. The work order says where to look.

### 2026-09-10 — `k` is a routing tag, not a claim about adaptation
The design's reclassification is **rejected**; the **day heading governs**. A 6–10 rep skull crusher is
certainly not power training, but `handoff-brief.md:185` assigns the progression protocol per *day*,
unqualified — `k` selects which rule runs, it does not assert a physiological category.
Two things settle it beyond the definition: flipping would drop power-day rest to 90 s ready / 120 s
cap, **below the 2–3 min minimum the brief itself states**; and the design's split is not internally
consistent (it keeps weighted pull-up, weighted dip and hack squat as `power` at the same 6–10 reps),
so there was no coaching position to rebut.
**To apply:** one documentation line defining what `k` means. The ambiguity has now produced one
escalation and one wrong list.

### 2026-09-10 — Rule X1: extra sets count for volume, not for advice
A set beyond the prescription is excluded from P1 and from **both sides** of H1's comparison; the
session volume total counts it. Worked both directions — extras can also *suppress* a correct load
increase, which is the direction nobody looks for.
**Two prototype corrections:** the `EXTRA` badge is computed from row index (`flag: i >= e.s`), so it
badges rows that are *driving* the verdict — it must be computed from completed-set ordinal. And the
"add sets freely" invitation should not render on power slots at all.

### 2026-09-10 — ST1: the measurement travels, the diagnosis does not
On a user-created plan, the stall *measurement* still runs, but the brief's diagnosis —
`the split isn't the problem and neither is the diet` — must not. That sentence was earned by a coach
who assessed *that* split; on a plan Chady built himself, the split is the most likely thing to
actually be wrong. Generic copy replaces it, gated on `derivedFrom:"phat"` plus the four key lifts
unchanged. D1's T3 backstop survives on a foreign plan; T1 and T2 do not.
**Also ruled:** ABSENT is held distinct from not-enough-data. Telling him to log more sessions when the
plan has switched a feature off is a lie.

### 2026-09-10 — The Diet tab would have misfed him on rest days
`PHAT App.dc.html:564/729` hardcodes `dietDay: "train"` and the label `Today — high-carb training day`.
**On Wednesday and Sunday it would show 3,200 kcal and 300 g of carbs where the programme says 2,500
and 60** — the rest days the whole carb-cycling protocol is built around. Its calibration block also
restates a decision procedure that contradicts Rule W1's thresholds: the same two-screens-two-rules
shape as B-06.
All eight macro numbers approved verbatim, with **the brief's medical caveat required** — the tab
displays 175 g of fat and currently carries none.

### 2026-09-10 — Schema 4: identity is opaque, `lift` is a second field, and no stored session moves
`backend-engineer`, WO-004 W2. Three decisions in one, all forced by the same finding: the design
prototype keys exercises `slug(name) + ":" + kind`, and every engine in `logic.js` reads history by
exercise id.
- **The id is opaque, minted once, never derived from a name, never rewritten by a rename or a
  reorder or a plan copy.** `n` is a display field. A rename that moved the key would orphan an
  exercise's entire history in silence, which is a P0 (CLAUDE.md §3.3).
- **`lift` is a separate grouping field, and it is also opaque.** Two ids, one lift: `d1h` and `d5i`
  are both `l_skull`, so Trend charts one Skull crusher line while `lastFor("d1h")` and
  `lastFor("d5i")` stay two histories — which they must, because one is 3×6–10 power work and the
  other 3×12–15 hypertrophy. If a rename rewrote `lift`, the grouping would break on exactly the
  rename this whole design exists to survive, so it does not. The lift's **display name** is resolved
  at read time from the plan (`liftName`), so a rename does relabel the trend line.
- **`lift` is plan data and is never written into a session.** A regrouping is therefore free forever
  and can never touch a logged number.

**The migration is the smallest one that can honestly claim version 4.** A session gains an *optional*
`planId`; existing sessions are not stamped, because an absent `planId` **means** the shipped PHAT
plan and `planIdOf` resolves that at read time. Not one stored session is touched and not one key is
added to the log store — plans live in their own store, `phat:v1:plans`. All the v4 pass writes is the
version, so the store stops understating its shape to WO-002's importer and to sync. One boot write,
the same trade QA accepted for v2 → v3.

**The `decisions.md` trap was avoided by construction, not by care.** The dateBasis pass now gates on
`V_DATEBASIS`, the four state keys on the new `V_STATEKEYS = 3` (it was `logVer < SCHEMA_VERSION`,
which bumping to 4 would have re-fired), and the plan pass on `V_PLAN = 4`. Asserted: a v3 store whose
sessions are marked `dateBasis:"local"` still reads `"local"` after migrating to 4.

**Three shipping tests now fail, and QA owns the fix.** `tests.html` lines 470, 786 and 795 assert the
literal `3` beside the same assertion against `P.SCHEMA_VERSION`. All three are one-token edits and
none is structural: 344/347, and the failure message on every one is `expected 3 actual 4`. Nothing
else in the suite moved — the four-argument `buildSession` still produces a byte-identical session
string, and a v1 store still gains exactly the six schema-3 keys and no seventh.
**Rules out:** any identity derived from a name; grouping stored history by `lift`; and any future
migration pass gated on `SCHEMA_VERSION`.

### 2026-09-10 — A plan copy PRESERVES ids. Only user-created slots mint new ones
`copyPlan` was the one place it would have been natural to re-mint. It must not: "my version of PHAT"
is the same programme with the same lifts, and re-minting would orphan every logged set at the exact
moment he first edits his plan — the B-46 bug arriving by a different door. Only `planId`, `name`,
`from`, `readOnly` and `createdAt` change.
Two riders: **`createdAt` is passed in, never read from a clock**, and is `null` when no usable local
date is supplied — a date nobody chose is a silent wrong number. And **removing an exercise from a
plan deletes no logged set**: history lives in `session.entries[exId]`, so putting the slot back with
the same id restores the whole trend. `removeExercise` returns the removed object so an undo can.

### 2026-09-10 — `derivedFrom` is the machine provenance; `from` is the human one
Folded into the plan document the same hour `strength-coach` ruled that ST1's *diagnosis* may only run
`gated on derivedFrom:"phat"`. Two separate fields on purpose: `from` is a sentence a user reads and
may edit ("Copied from PHAT"), `derivedFrom` is an id nothing renders. If one field did both jobs,
renaming a plan would change which rules it is allowed to run.
`copyPlan` **carries** `derivedFrom` rather than rewriting it — a copy of PHAT is still derived from
PHAT, and a copy of that copy still is. A plan built from empty has no `derivedFrom` and never
acquires one, which is exactly the ABSENT state W3 has to make silent.

### 2026-09-10 — Identity is opaque, and `lift` carries the grouping the design wanted
The plan document ships with **opaque ids minted once and never rewritten** by rename, reorder or copy
— `d1..d5`, `d1a..d5j` and the lift tokens are hand-authored frozen tokens in that same space, not
values recomputed from a name. One namespace per plan for day, exercise and lift ids, so a mint cannot
collide across kinds.
**`lift` is grouping only, and plan data only** — never written into a session. Regrouping is therefore
free forever and can never touch a logged number. 34 groups over 42 slots. Grouping rule: same name ⇒
same lift; a speed slot ⇒ its source lift's group; **ambiguous ⇒ separate**, because a wrong grouping
merges two lifts into one wrong trend line while a missing one only costs a second line. Display names
resolve at read time, so renaming "Bent-over row" to "Pendlay row" relabels the trend line correctly.
**No engine takes a lift id** — Trend calls the id-keyed engines once per id and merges.
`derivedFrom` is separate from `from` precisely so that renaming a plan can never change which rules it
is allowed to run (the ST1 diagnosis gate).
**The trap avoided, one version later:** the v3 pass was gated on `logVer < SCHEMA_VERSION`. Bumping to
4 would have re-fired WO-001's `dateBasis` pass over a v3 store and stamped correctly local-dated
sessions as `"utc"` — the identical trap recorded under "Schema 3, and what it obliges". Every pass now
gates on its own constant: `V_DATEBASIS`, `V_STATEKEYS`, `V_PLAN`.
**The v4 migration stamps the version and moves zero bytes.** A session's `planId` is optional, and
absent **means** the shipped PHAT plan, resolved at read time.

### 2026-09-10 — MY ERROR: `git add -A` in a shared worktree
Committing a docs-only change with `git add -A` swept ~830 lines of `backend-engineer`'s in-progress
`logic.js` into the coach's commit `ccd1453`. Nothing was lost and the tree is correct, but code was
committed **before its author had finished or reported it**, and the history attributes it to an
unrelated change. The branch was not rewritten because another agent was committing to it.
**Rule, now in CLAUDE.md §4b:** commit named paths, never `-A`, whenever anything else is in flight —
and if you don't know what else is running, name paths anyway.

### 2026-09-10 — Ghost, not prefill — and the argument is a data bug, not a purity one
The design prefills the weight field from last session. `ux-designer` ruled **ghost**, and the decisive
reason is not provenance: the prototype prefills `w` and leaves `r` blank, which is WO-001's
`incomplete` — so **every exercise he skips becomes a blocked save with a `no reps` token, on a screen
he never visited.** A convenience feature that silently arms a refusal.
The ergonomics are bought back another way: **the first `+` on an empty weight field adopts last
session's weight; the second steps from it.** He tapped for it, so provenance is intact. That is
WO-001 §2.8's "normalise, don't also step" precedent reused.

### 2026-09-10 — In a mono-signal palette, refusal is form, not colour
2a has one signal colour, so a refusal cannot be distinguished from advice by hue. Four carriers at
once: a four-sided border where advice has a left rule, a literal `!`, the headline `Not saved.`, and
tappable rows — the only block in the app that has them.
**The new problem one-exercise-per-screen creates:** the offending row can be on a screen he is not
looking at. So a problem row **navigates**, and a fixed-height **fix bar** rides that screen
(`{p} sets left to fix.` / `BACK TO SAVE`) and never disappears while a refusal stands.

### 2026-09-10 — The verdict kicker names the block, not the finding
`PHAT.verdict` returns `{t,x,x2,rule}` where `t` is a direction token, not a label — it has no kicker
string and **must not gain one**. The design's `Overload` / `Hold` / `Volume up` kickers have no engine
source, and authoring them in the view would be a second, shorter verdict that can disagree with `x`.
Ruled: four fixed view-owned labels that say what the block *is* — `WAITING` / `VERDICT` /
`SPEED WORK` / `DELOAD WEEK` — with the silence body `Nothing to say until all {s} sets are in.`

### 2026-09-10 — No control anywhere reduces the length of the log
`SWITCH TO AN EMPTY LOG` is **deleted, not confirmed.** Demo mode already gives him a clean slate to
look at, so a control whose only function is to destroy history has no job left. Demo mode carries a
visible band on all ten screens; the demo store is a separate key and the real log is never written.
**Rules out:** any button, anywhere, that shortens `phat:v1:log`. Export exists for leaving; deletion
is not a feature.

### 2026-09-10 — A third contrast failure, found by measuring on the right surface
`.lbl` at `.50` opacity is **4.3 : 1 on `--surface`** — the earlier audit measured it on `--bg` and
passed it. It is used inside every surface card.
**And the pips:** raising `.18` to a passing `.45` would erase the done/upcoming distinction the
opacity was carrying. So the meaning moves to text (`Exercise 3 of 7`), the strip becomes
`aria-hidden`, and the painted pips distinguish by **form** — filled, amber double-height, outline-only.
**Worth keeping as a method:** when a contrast fix would destroy the signal the colour was carrying,
move the signal to text and let the graphic become decoration.

### 2026-09-10 — The rules move onto the plan, and ABSENT is a state, not a silence
`SPEED_SRC`, `REINTRO_ORDER`, `KEY_LIFTS` and the weeks-1–4 block were constants in `logic.js`, which
asserted that every plan is PHAT. They are now fields on the plan document (`speedSource`,
`reintroOrder`, `keyLifts`, `reducedWeeks`) and the exported constants are **compiled from the shipped
plan**, identical in value. A copy inherits them; `removeExercise` scrubs references to a deleted id;
every reader reconciles again on the way out, so no engine can be handed a dangling id.
**Three states, not two** (coach Rule C7a): ABSENT is checked **first** and never shares copy with
not-enough-data. `Log it weekly` is a lie when the plan has the feature switched off — he would log for
six weeks waiting for a message that cannot arrive. Uniform shape on all five:
`absent` / `absentLines` / `absentLine`.
**`reason` is not part of that shape.** `deloadCheck.reason` is a developer signal that must never be
rendered; overloading it would put a developer token one careless template away from the screen.
**Defaulting:** every engine's optional `plan` falls back to the **shipped PHAT plan**, never to "a plan
that declares nothing". A caller's mistake must not become a confident ABSENT sentence about a plan
that does not exist. `isPlanDoc` (an object with a `days` array) is the test — a plan built from empty
still has `days: []`, and `{deload:…}` is not a plan.

### 2026-09-10 — ST1: the measurement travels, the diagnosis does not (Rule C7b, implemented)
`stallReport` is the **measurement** — Epley, `r ≤ 8`, two 21-day blocks, 1.025 — and it is plan-agnostic
arithmetic that runs on any plan, unchanged, with its three-key shape untouched.
`stallAdvice` is the **diagnosis** and is a **separate function**, so the arithmetic can be called
without ever reaching the sentence and the sentence cannot be assembled anywhere else.
`The split isn't the problem and neither is the diet` is spoken only when `phatProvenance(plan)` is
true: `planId === "phat"`, or `derivedFrom === "phat"` **and** the same four key lifts are still present
**and** their `s`/`lo`/`hi` are unchanged. Renaming a slot or editing a cue keeps provenance; a 5 × 5
squat loses it. It **fails closed** — false costs one sentence of specificity, never a wrong claim.
D1 splits the same way: T3 (dates only) survives a foreign plan with restated copy; T1 and T2 do not.

### 2026-09-10 — Rule SP0 is deleted rather than left unreachable
`verdict()` still returned `Submaximal and fast. Do not grind these.` on a speed card — replaced by
`speedLoad().instruction` in WO-003 §4.2, and unreachable only because the view stopped calling it.
An unreachable second opinion about speed work is precisely what the next caller finds and ships.
**Ruled: `verdict` returns `null` for `k:"speed"`.** One source for the speed sentence — `speedLoad`,
`text` for the load and `instruction` for how to move it. Silence, not a second sentence.
**Known consequence, accepted:** on today's `index.html` the three speed cards go blank until W7 wires
`speedLoad`. Losing a sentence sourced from the wrong engine is cheaper than keeping it.
Confirmed at the same time: **`PHAT.verdict` gains no kicker string.** `t` is `"up"`/`"down"`/`""`, a
direction token, and nothing in `logic.js` implies a label.

### 2026-09-10 — Rest is a function of the exercise; the caller owns the clock
`PHAT.restTarget(ex)` reads `ex.k` and `ex.hi` and **nothing else** — no day field, no plan field, no
history. `rest` is not a field on a day and must not become one: it would be a second source of truth
for a rule that already has one, and the design's per-day number is wrong on 24 of 42 slots and calls
him *ready* at speed work's hard cap on the three slots where the short rest **is** the stimulus.
**`hi` missing → the conservative row, and conservative flips sign by role** (coach §8.5): power 150 and
hyp 90 are the *longer* rests; speed stays 60/90, the *shorter*, because for speed work resting too long
is the harmful direction. Written out in the engine rather than derived — it is the one place in the app
where "play it safe" means two opposite things.
**`k` unrecognised → `null`**, and `restText` renders its idle line. Fail silent, never fail confident.
`restText(ex, elapsedSeconds)` takes **elapsed seconds**, so the caller owns one absolute timestamp and
nothing in this file reads a clock. State 5 reports `stopped` so the caller can stop ticking.

### 2026-09-10 — MY ERROR: a test pass and an edit pass on the same file at once
I ran `qa-engineer` against `logic.js` while `backend-engineer` was landing W3 into it. `logic.js` moved
four times mid-run (200 KB → 238 KB), and twice that produced red in tests QA had not touched —
`speedLoad` gained a fifth argument, `REINTRO_ORDER` moved onto the plan document. Both cleared on
their own, and QA only knew because it re-ran.
**The cost is not the red, it is the meaning of green.** W3's own acceptance criterion is "the whole
suite passes unchanged before a single new test is added" — that criterion was transiently false and
nobody could have told from the final number.
**Rule:** never run a verification pass against a file another agent is actively editing. Sequence
them, or point QA at a commit rather than the working tree. Same family as the `git add -A` error:
three agents, one worktree, and me treating them as if they were isolated.

### 2026-09-10 — The schema-gate mutant is killed only by the note text
Reverting `V_STATEKEYS` to `SCHEMA_VERSION` leaves the stored bytes **identical**. What changes is the
account: the v3 pass re-fires, reports "added no new key", and the v4 pass then says nothing. Same
store, wrong story — and a latent bug that stops being harmless at v5.
So the kill is an assertion on `notes`, not on data. **Worth generalising:** where a migration's only
observable difference is its own account of what it did, the account is the thing to assert.

### 2026-09-10 — A version literal is a tripwire, and it belongs in exactly one place
QA decided the three failing assertions per test rather than bumping them together:
- **The constant test keeps its literal**, because a schema bump creates an obligation on code that
  does not exist yet — WO-002's importer owes 2, 3 and 4 — and that must be impossible to do quietly.
  Asserting the constant against itself would prove nothing.
- **The other two drop it.** Three tripwires on one fact is one test plus two maintenance costs, and a
  bump done mechanically in three places is a bump nobody read.
- The third was **replaced, not fixed**: every pass ends by stamping `SCHEMA_VERSION`, so a future
  gated-but-unreached pass would still leave the number correct. **The version assertion could not
  detect the bug that test existed for.** The added-key set and a second run reporting `changed:false`
  can, and now do — which is what "migrates in one pass" means when you test it rather than infer it.

### 2026-09-10 — Two criteria in our own work order asked for opposite things
WO-004 W14 criterion 3 said a duplicated plan gets **new** ids and therefore separate history.
Criterion 1, four lines above it, said switching to a copy and back must leave the log diffable —
which is *only satisfiable because ids are preserved*. Both `ux-designer` and `backend-engineer` flagged
it independently, from opposite directions.
**Criterion 1 is the true one.** `copyPlan` preserves ids deliberately: re-minting orphans every logged
set, which is the entire reason identity is opaque. Criterion 3 is struck and restated, and the UI ships
the true sentence — `The copy keeps this plan's history.`
**Worth noticing:** the contradiction survived a PM pass, my read, and a coach adjudication. It was
caught by two agents *implementing against it*. A criterion is only really reviewed when someone has to
satisfy it.

### 2026-09-10 — ST1 splits into measurement and diagnosis, as two functions
The coach's ruling — the measurement travels to a user-built plan, the diagnosis does not — is
implemented as a split rather than extra keys. `stallReport` is untouched: same three keys, same
arithmetic, runs on any plan. `PHAT.stallAdvice` carries the diagnosis and is gated on
`phatProvenance`. `The split isn't the problem and neither is the diet` is unreachable unless the plan
is PHAT, or derived from it with the same four key lifts at unchanged `s`/`lo`/`hi` — a rename keeps
provenance, a 5×5 squat loses it. D1 splits identically: T3 survives on a foreign plan with restated
copy; T1 and T2 go silent.
**Also:** ABSENT is tested **before** thin, and `reason` was deliberately not overloaded to carry it —
`deloadCheck.reason` is a developer signal that must never render.

### 2026-09-10 — No slot id survives in code outside the plan document
`SPEED_SRC`, `REINTRO_ORDER`, `KEY_LIFTS` and the weeks-1–4 block are now plan data. The only remaining
`"d1a"`-style literal in `logic.js` is inside a comment. Every reader **reconciles**: an id a table
names that the plan no longer contains is dropped on the way out, and `removeExercise` scrubs the
document itself. Drop the reference, keep the rest — deleting `d1a` costs `d3a` its speed number and
costs `d4a`, `d5a`, the reintro order and the other three key lifts nothing.
**Accepted regression, temporary:** `verdict()` now returns `null` for `k:"speed"` (SP0 deleted, one
source for the speed sentence), so the three speed slots render blank on the branch until W7 wires
`speedLoad`. Losing a sentence sourced from the wrong engine is the cheaper side.

### 2026-09-10 — Rule PE1, and the one hazard in this project with physical stakes
I put the copied-plan history question to the coach with two framings. It rejected both and reframed
it: not *which field changed*, but **what the rule asks history for**. **Measurements cross a
prescription change; prescription-relative comparisons do not.** History is never hidden, never re-keyed.
It then checked rather than assumed, and three of the four rules I named do not have the problem:
P1 is history-free (this session's sets only); T1 self-protects — an old `100×5/5/5` fails a new `lo:8`,
so 100 kg cannot anchor a failure row; SP1 self-limits through its reps-in-[3,5] filter.

**The hazard that was not on my list is the serious one.** `PHAT App.dc.html:629` prefills the weight
box from the last session. Across a 3–5 → 8–12 prescription change **that types his 3–5RM into an 8–12
slot.** In the coach's words: a failed rep under a loaded bar, not a wrong percentage. PE1 empties the
box and relabels the ghost across an epoch change.
**Two agents rejected prefill from two unrelated directions** — `ux-designer` because prefilled weight
with blank reps is WO-001's `incomplete`, silently arming a blocked save on every skipped exercise;
`strength-coach` because of this. Neither knew the other's reason. That is the argument for having both.
Epoch key is strict `(s, lo, hi, k)` with **no tolerance band** — it over-triggers deliberately, and the
coach named that as intended, so it must not be softened later as a false-positive "fix".

### 2026-09-10 — Small rulings that each close a seam
- **ST1 names lifts with the plan's full name; no `short` field.** My `Row, Squat` example is
  superseded — a short-name field would be B-27 with a schema slot to live in.
- **`reducedWeeks` pre-fills 4 visibly and editably, never invisibly.** A default applied silently to a
  self-built tier is the app making a programming decision it was not asked to make.
- **The session count counts distinct dates**, or the line contradicts the training-week number printed
  beside it. The counting ruling reaching one more place.
- **ST1 below four key lifts names them, never counts them** — and **fewer than four key lifts is a
  VALID plan.** Do not let `validatePlan` be "fixed" to reject it; what is missing is disclosure.
- **`cycleLine` never prints `Week 0`.**
- **`painState` clearing confirmed as built**, with a 21-day restatement that **names the avoidance and
  points at a person, never an all-clear.** Not adjustable wording.
- **`d2e` resolving to lying leg curl needs `implement: bodyweight → machine`** — the one data-touching
  change in the document, free today and not free later.
- **The `EXTRA` badge must key off completed-set ordinal, not row index.** As written it badges the rows
  that are driving the verdict.

### 2026-09-10 — The ghost names the heaviest set, and the second clause is not optional
Confirmed, but **not for the consistency reason I gave**. "Last set" is a row-order artefact, and X1
makes it wrong outright: on `100×5, 100×5, 100×5, 80×8 [EXTRA]` the last set is the back-off, which X1
already rules cannot describe the prescription. Naming it in the one sentence he reads *while deciding
what to load* would hand him the least representative number in the entry.
The counter-argument — heaviest anchors high in the dangerous direction — is real but does not survive
the direction test: a rule that flips on edit direction is fiddly for little gain. It holds **only
because the second clause stays**: `Pick a weight for 8–12.` That clause is what makes the number
history rather than a target, and it is not optional.

### 2026-09-10 — The per-row ghost disappears across an epoch. Not captioned — gone
`Last 100 × 5` sitting beside a deliberately-emptied weight box **is** a target, whatever caption is
attached to it, and PE1 exists precisely to stop those numbers reading as targets. Repeating the old
prescription on three or four rows would also re-inflate the string B-37 measured at zero width at
400 px — undoing the redesign's best structural fix.
**Rules out:** solving a "this number means something different now" problem by labelling the number.

### 2026-09-10 — X1's extra-set line ships; the UX §4.5 line is withdrawn
Both were the coach's to reconcile and it withdrew its own later one. §4.5 (`It counts in volume; the
target does not change.`) **answers the wrong question** — "the target does not change" is about the
prescription line, but the question after logging a fourth set is *did that count?*, and only
`The verdict reads the first 3.` answers it. X1 is also role-specific, which matters: the right message
on a 3 × 3–5 squat is not the right message on a lateral raise.
**Carried over from the withdrawn line:** at `n === 1`, prefer `Set 4 is past the prescription.` over
`1 set past the prescription.`

### 2026-09-10 — A deload is a temporary instruction inside a prescription, not a change to it
Confirmed, and the reason is cleaner than the implementation's: the plan still says 3 × 3–5, and DL1
says do two of them. `Prescription changed to 2 × 3–3` would be **false on its face** — `3–3` was never
prescribed. And emptying the weight box would remove the one thing a deload week guarantees: the loads
stay put. Same principle as E2, one layer down.

### 2026-09-10 — An unrecognised `k` fires no verdict at all
A free rider the coach attached to approving `kWord`'s fallback copy: if an exercise's role is not one
the rules know, the app says nothing about it rather than guessing which rule to run. Consistent with
fail-silent-never-fail-confident, and it closes a hole the plan editor could otherwise open.
**Also approved, with the register objection answered rather than waved:** `hypertrophy work` reads
clinical, but the app already uses "hypertrophy" in three of five day names, and a warmer synonym would
give one concept two names — the defect in B-27 and the reason a `short` field was rejected.
Consistency beats register when the alternative is a second vocabulary.

### 2026-09-10 — A ruling that post-dates its implementation is an open item, not a regression
The coach's §9.11 arrived after `bd9ad1a` shipped. Two of its rulings are therefore not yet true of the
code, and QA pinned them **green against the observed wrong behaviour** with the ruling quoted in the
test name, rather than carrying a red.
That is the right call and worth stating as policy: **carrying a deliberate red would put both
meta-tests at risk** — the ones that fail on any `known bad` / `xfail` name — and re-create exactly the
"expect one failure" failure mode that ruling was written to prevent. Pin the truth, name the ruling,
invert the assertion when the fix lands.

### 2026-09-10 — Three defects, and the one that matters is reachable only by import
- **P1: an unrecognised `k` still fires a hypertrophy verdict.** `verdict()` returns null for `speed`,
  routes `power` to P1, and **falls through to H1 for everything else** — so a `k:"tempo"` exercise gets
  a confident tonnage comparison. The coach's rider: *an app that cannot tell which rule applies must
  not run one.* Unreachable from the plan editor, which constrains `k` — **reachable from imported or
  corrupt data, which is exactly what WO-002 produces.**
- **P2: the schema-3 migration pass labels its own note `Schema 5`.** It interpolates
  `SCHEMA_VERSION`; v4 and v5 correctly interpolate their own gate constants, which is why only this
  one drifted. It has been wrong since the 3 → 4 bump. No data impact — but `decisions.md` already
  rules that a migration's account of itself **is** its evidence, and this account names the wrong
  version.
- **P2: X1's extra-set line counts where the ruling prefers the ordinal** at a single extra set.

### 2026-09-10 — Two mutants found real holes; one survivor is equivalent until the next bump
QA injected 20, killed 19. **Two exposed genuine gaps and were closed**: a tie-break to latest rather
than earliest, and `keyLiftDisclosure` naming a PHAT exercise to a plan that never came from PHAT —
uncovered because *every fixture happened to declare only ids its own plan contained*. QA's note on
that one is the useful part: **the uncovered case is one careless paste, and it is what an importer
will produce.**
The survivor (`logVer < V_RX` → `logVer < SCHEMA_VERSION`) is **equivalent today** — both constants are
5, and the note interpolates `V_RX`, also 5, so no input distinguishes them. It carries a test written
against the constant that goes red at the 5 → 6 bump, which is when it stops being equivalent. Same
family as the `V_STATEKEYS` trap, one version later.

### 2026-09-10 — `Set 4` names the ROW, not the completed-set ordinal
Implementing §9.11's carry-over needed a number the ruling did not have to disambiguate, because in
its example the two candidates coincide. They separate as soon as a row is left blank: fill rows 1, 3,
4 and 5 on a 3-set exercise and the extra is the **fourth completed set** but the **fifth row**.
`extraSets` picks the row — the first flagged row that is itself a completed set — because the number
in the sentence has to be the number the user can see. The view labels rows `i + 1`
(`index.html:571`) and the EXTRA badge sits on the row, so an ordinal would put the sentence and the
badge on different numbers, which is the prototype's lie relocated rather than fixed. The *flags* stay
ordinal-driven; that was never the question — only the copy is row-numbered, and only at `n === 1`.
**Unchanged and deliberate:** a blank trailing row is flagged but is not a set and cannot be named.

### 2026-09-10 — The role gate is in `verdict()`, not in every rule that reads `k`
`PLAN_KINDS.indexOf(ctx.ex.k) < 0 → null`, above the deload branch, so DL1 cannot fire on an
unclassified exercise either — a deload is an instruction about a prescription whose role is known.
**Two same-shaped fall-throughs are left alone because no rule covers them, and inventing one is not
mine to do:** `extraSets` gives an unrecognised `k` the hypertrophy tail (`Counted in today's volume,
not in the verdict.`), and `incrementLine` gives it the hypertrophy increment line. Both are now
unreachable alongside a verdict, since there is no verdict; both are reachable by a view that calls
them directly. Flagged to the coach as the next layer of the same question.
