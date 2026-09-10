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
