# Phat Gym Track

Personal training log for a PHAT (Power Hypertrophy Adaptive Training) program. Two users, Chady and Diana, one account each on their own phone (WO-008).
Used **on a phone, in a gym, between sets, one-handed, with chalky hands.** Every design and
engineering decision is judged against that sentence.

---

## 1. THE ROUTING RULE — read this first

**Every incoming request goes to the `project-manager` agent before any other agent or any code is written.**

No exceptions for "small" asks. The PM's job is to turn a sentence from Chady into a sequenced
work order with acceptance criteria, then name which specialist owns each piece. Only after the
PM has produced that work order do the specialist agents run.

```
Chady's ask
     ↓
project-manager ──> produces WORK ORDER (scope, sequence, owners, acceptance criteria, risks)
     ↓
main session dispatches each item to its owner agent
     ↓
qa-engineer verifies against the acceptance criteria
     ↓
PM closes the item, updates docs/backlog.md
```

Important mechanical note: a subagent cannot reliably spawn other subagents. So the PM **plans and
routes; the main session does the dispatching.** The PM outputs a work order; the main session then
launches the named agents. Do not ask the PM to "go build it."

Only two things skip the PM:
- Pure questions that change no files ("what does `verdictFor` do?").
- An explicit instruction from Chady naming an agent directly ("have the UX agent look at this").

### The agent roster

| Agent | Owns |
|---|---|
| `project-manager` | Intake, decomposition, sequencing, acceptance criteria, backlog, saying no |
| `frontend-engineer` | UI, DOM, state, rendering, CSS, SVG charts and diagrams |
| `backend-engineer` | Data model, storage, migrations, Supabase, sync, auth, pure logic engines |
| `qa-engineer` | Test harness, regression tests, edge cases, verification before anything ships |
| `ux-designer` | Flows, hierarchy, copy, accessibility, gym-context ergonomics |
| `strength-coach` | Correctness of the *training advice* — progression, volume, deloads, nutrition cues |
| `release-engineer` | Git/GitHub, Vercel deploys, PWA/offline/install, env vars, data durability |

`strength-coach` is not decoration. This app gives coaching advice. Code can be bug-free and the
advice still wrong, and QA cannot catch that. Any change touching `verdictFor`, the stall detector,
bodyweight advice, or `PROGRAM` must be reviewed by `strength-coach`.

---

## 2. Current state — 2026-09-13, after WO-011 (`main @ bbcdac3`)

**The app is live, offline-capable, backed up, and holds one real session.** `https://gym-app-psi-eight.vercel.app`

- **Files that ship — 60.** Twelve shell files: `index.html` (~7,300 lines, every screen), `logic.js` (~9,200 lines,
  every rule engine and pure function behind `window.PHAT`, a classic script so `tests.html` runs from `file://`),
  `sync.js` (the backup client, an ES module, injected after first render and only on `http(s)` when online),
  `tests.html`, `diag.html` (read-only, not precached), `sw.js`, `manifest.webmanifest`, `assets/archivo-inline.css`, four PNG icons — plus **48 exercise
  photographs** under `assets/ex/` from one generated manifest. **A deploy is all 60 or nothing** — a Vercel deployment
  is an immutable snapshot, not a patch; a file left out ceases to exist at that deployment. `docs/deploy.md` is the
  procedure; `scripts/verify-deploy.sh` fetches the bytes and compares them to the tree.
- **Screens built:** Train/Home (onboarding, Settings — Backup, Account with `Change password`, Gym), Session, Summary,
  Trend, Weight, Diet, **Plans list + Plan Editor** (WO-006) with the cross-day **re-split** that keeps an exercise's id
  (WO-007). Photographs replace the stick figures on 32 of 42 slots; 10 are cue-only (B-105, B-106).
- **Units (WO-010):** a set is entered as **bar + added weight, in kg or lb, as a total**; the kg total prints on every
  row. `w` is always the kg total every engine reads; `ld: {bar, bu, add, au}` beside it holds the components and
  **absent means kg**. The increment ladder (coach §18, Rules L1–L4) is chosen by the set's `ld`, never the slot: 2.5 kg
  kg-direct, 5 lb on a lb build, and the verdict prints the kg total then the build. Settings → Gym holds bars only,
  per device, in `prefs`.
- **Storage:** `localStorage` under `phat:v1:log`, `bw`, `draft`, `prefs`, `plans`, `planedit`; auth session under
  `phat:auth`; `phat:v1:recover:*` written before any restore replaces a log. `SCHEMA_VERSION` is **6**. Migrations
  are gated on their own version constants (`V_DATEBASIS`, `V_STATEKEYS`, `V_PLAN`, `V_RX`, `V_LD`), never on
  `SCHEMA_VERSION`; the v6 pass stamps the version and moves zero bytes. The importer owes 2–6.
- **Tests:** `tests.html` from `file://`, no Node. **Read the file for the count** — on `main` at `bbcdac3` it is
  `842 / 842 / 0`. Three meta-tripwires forbid any named or expected failure, any skip without a reason, and any
  fixture writing a `phat:*` key. Every rule change since WO-005 was pinned by running the new tests against the
  *pre-fix* `logic.js` and confirming they go red. Chady's first logged session is a fixture, by id, on his real export.
- **Backup (E-3, amended by WO-011):** Supabase project `nkebsoqjtkcdiswrmely`, `us-west-2`, Postgres 17. **Push after
  every save, and pull-and-merge on every open** — Chady's ruling of 2026-09-13 (*"it needs to pull from the db"*),
  which superseded E-3's "the server never writes to the device except on Restore". `mergeOnOpen` (open, first run,
  sign-in, `online`, and Settings → **Check the backup now**) pulls the account's rows through the Restore validators
  and `PHAT.mergeStores`: **union by id, the local document wins byte-for-byte on a collision, nothing is ever removed
  by a pull**, then the merged set is pushed. One `recover:*` keep per device before the first merge that changes a
  non-empty store; announced once when it adds; never repaints under a thumb (`mayPaint()`). The manual Restore with
  typed `REPLACE`, export-first and `recover` copy still exists as the replace-all path. `diag.html` is a deployed
  **read-only** storage report (keys, schema, session ids, `recover:*`, SW caches, live build) — open it first when the
  phone and the server disagree; it is not in the SW shell list. RLS on all five tables, verified from outside. Demo data (`demo:true`) is refused on push and refused whole on restore
  (C-14). The draft and preferences do not back up. Schema in `supabase/`; the SQL validator mirrors
  `validateSessionDoc` sentence for sentence (`migrate-006-ld.sql` applied). **The Management API runs a submission
  as one transaction**, so `rls-selftest.sql` is separate — its trailing `rollback` once discarded all the policies.
- **Auth:** email + password, **two accounts, Chady and Diana, one per phone** (WO-008); **sign-ups are locked**. Magic
  links were rejected: a link from an email opens in the browser, not the installed PWA. A device's stores belong to
  the account that first backed them up; a sign-in to a different account is refused, not merged. Server state at the
  last close: 2 users, 1 session, 0 conflicts.
- **Deploy:** manual Vercel API, **team-scoped** (`teamId` required on every call). The GitHub App is still not
  installed; installing it on `chadyantoun-ux/Gym-App` makes a push to `main` deploy itself and retires the manual
  upload. **Bytes come from `git cat-file blob`, never the working tree** — `core.autocrlf` is on here. Verify a deploy
  by fetching `/logic.js` and requiring the current version constant in the body, never a build status. `sw.js` is
  **`v6`** (WO-011 P1, B-122). **The rule, learned on the phone: once per worker lifetime is not once per launch on
  iOS** — v2–v5 refreshed the shell once per worker and then served their cache forever, so a content deploy under an
  unchanged VERSION never reached him. v6 refreshes on every navigation, throttled by a timestamp *in the cache*, never
  in worker memory; a waiting worker activates when the page posts `phat-idle` (from `render()`, only where `mayPaint()`
  holds) — still no `skipWaiting`, still no reload. VERSION moves when the shell file list changes, when a cached entry
  must be discarded, **or when the cache holds a shell the refresh cannot replace** (why v5 → v6 on a same-list deploy);
  photographs are gap-filled, never re-fetched — **a re-shot photo under an existing path ships only by a VERSION
  bump.** A phone still on a worker older than v6 takes the new one only when its page is closed once.
- **Live wrong-advice bugs closed, worth knowing because each shipped for a while:** Rule P1.2 fired on `!equal`
  (`100/100/120` earned a worse verdict than `100/100/100`); the diet screen had no day type, a 700 kcal error on rest
  days; `index.html` carried a duplicate `PROGRAM` that had drifted from the plan document — **there is one programme
  source, `PHAT.PHAT_PLAN`**; and until WO-010 a kg-direct miss at ≤ 22.5 kg printed `Drop to {the same load}`.
- **Open, on the record:** **B-116 — warm-up sets**: his first session logged a five-set ramp (20 → 70 kg) on a
  3 × 3–5 slot and every engine read it as prescribed work; logged, marked, or omitted is the PM's first question for
  the next planning pass, unanswered. B-111 (`Swapped` mark — coach recommends it, Chady's yes/no owed), B-117 (his
  bars by name; does the gym have 2.5 lb plates), **B-76** (a stale tab's `finish()` writes memory over disk — QA wrote
  one session over ten in WO-011; the merge restored them from the server, which is mitigation not fix, and a session
  never pushed before the overwrite is on no row anywhere; B-123 and B-124 are the same class, filed with it — the
  first backend item on the store layer), B-121 (local-wins on a same-id collision, accepted until a second device),
  B-05 (no edit or delete of a saved session), B-04 (file importer, owes schema 2–6), B-98 (an account cannot
  hard-delete its own server row — P1 the day a delete syncs), B-97 (Home fold at 393 × 852), B-114 (`+ 0 lb` drop
  phrase), B-11, B-19, B-36, B-45. **Chady's, once:** close the page on his phone so the v6 worker activates (B-122).
  `docs/backlog.md` is the list.

### Stack — built

| Layer | Choice |
|---|---|
| Source control | GitHub, `main` is deployable at all times |
| Hosting | Vercel, static, **no build step**, manual API deploy until the GitHub App is installed |
| Database | Supabase Postgres 17 with RLS on every table; the set validator mirrored in SQL |
| Auth | Supabase Auth, email + password, two accounts, one per phone, sign-ups locked, RLS per user |
| Client | Vanilla JS; `@supabase/supabase-js@2.116.0` from jsDelivr as ESM, in `sync.js` only |
| Offline | `localStorage` is the source of truth during a workout; Supabase is backup, never a precondition |

Rationale in `docs/architecture.md`. Decisions in `docs/decisions.md`. Coaching rules and every
sign-off in `docs/coach-audit.md` and `docs/coach-audit-addendum.md` (§12–§18; §18 is the mixed-unit ladder).
Screen specs in `docs/specs/wo-004-screens.md` (§19 is the units row, chip and Gym settings).

---

## 3. Hard constraints

These are not preferences. Violating one is a defect.

1. **No build step.** No bundler, no transpiler, no framework. Anything that requires `npm run build`
   to view the app is rejected. Load libraries from CDN as ESM.
   **This is a choice, not a limitation — correcting an error in this file.** Node **is** installed
   (`C:\Program Files\nodejs`, v24.14.1, npm 11.11.0); it is simply not on the git-bash `PATH`, so an
   early `command -v node` returned a false negative that was written down here as fact. The constraint
   stands on its own merits: the app is one file a phone opens directly, it must run from `file://` and
   from static hosting with nothing between the source and the screen, and a build step is a thing that
   can be broken or forgotten between him and a logged set. Do not cite "Node isn't available" as the
   reason — cite that.
2. **Offline-first.** The gym has no signal. A workout must be fully loggable with the network off.
   Network writes are best-effort sync on top of local storage, never a precondition for logging.
3. **Never lose a number.** Data loss is the only P0 class of bug. An in-progress session must survive
   a reload, a phone lock, a browser kill, and a failed save.
4. **Local dates, never UTC.** `new Date().toISOString()` for a calendar date is a bug — it shifts the
   day for anyone not on UTC. Use local date components.
5. **Stored loads are kg.** Entry is bar + added weight, in kg or lb, as a total, not per side; `w` is
   always the kg total and `ld` beside it records the components (absent means kg). The step is in the
   entry unit: 2.5 kg or 5 lb. Bodyweight is kg in steps of 0.1 kg.
6. **Touch targets ≥ 44 px.** Thumb-reachable. Nothing important in the top corners.
7. **Secrets:** the Supabase *anon* key is designed to be public and may live in client code, but only
   behind RLS. The *service_role* key must never appear in the repo, in client code, or in a prompt.
   Server-side secrets live in Vercel environment variables only. `.env.local` is gitignored.
8. **`main` always deploys.** Vercel publishes `main`. Work on branches, merge when QA passes.

---

## 4. Conventions

Match the existing code; it has a deliberate style.

- **Naming is terse on purpose**: `S` (state), `vol`, `ex`, `r1`, `esc`, `PROGRAM`, `KEY_LIFTS`.
  Keep it. Do not rename to `applicationState`.
- **Data shapes**: an exercise is `{id, n:name, s:sets, lo, hi, k:"power"|"hyp"|"speed", cut?:1}`.
  A logged set is `{w, r}` as *strings* while drafting, coerced at read time.
- **Rendering** is template strings → `innerHTML`, one view function per tab (`vTrain`, `vSession`,
  `vTrend`, `vWeight`). Any string that could contain user input goes through `esc()`.
- **CSS** uses the `:root` token set (`--bg`, `--surface`, `--line`, `--bone`, `--dim`, `--faint`,
  `--amber`, `--green`, `--red`). Never hardcode a hex outside `:root`.
- **Copy voice**: terse, second person, imperative, no hype, no emoji, no exclamation marks.
  "Stay at 100 kg until all 3 sets reach 5 reps." Not "Great job! Keep pushing! 💪"
  Numbers are never dressed up. The app is a training partner who doesn't flatter you.
- **Pure logic stays pure.** Progression, volume, averages and verdicts must be functions of their
  arguments with no DOM and no globals, so `qa-engineer` can test them.

---

## 4b. Committing while agents are running

**Never `git add -A` while another agent is working in this directory.** Agents share one working
tree, so a blanket add sweeps another agent's half-written file into your commit. It happened on
2026-09-10: a `git add -A` for a docs-only change pulled ~830 lines of an in-progress `logic.js` into
an unrelated commit. Nothing was lost, but code was committed before its author had finished or
reported it, and the history now attributes it to the wrong change.

**Never `git checkout` a branch in the shared tree from inside an agent.** On 2026-09-12 a QA agent
checked out its own lane's branch while a second lane was mid-flight; the second lane's commits landed on
the wrong branch until the main session repointed it. Nothing was lost, but only because the two trees
happened to be identical. The main session sets the branch before dispatch and the brief names it; two
concurrent lanes are the main session's to serialise or to give separate worktrees.

**Commit named paths.** `git add logic.js docs/decisions.md`, never `-A`, whenever anything else is in
flight. If you don't know what else is running, name paths anyway — it costs one extra word.

## 5. Definition of done

An item is not done until all of these are true:

- [ ] Acceptance criteria from the PM's work order are met, item by item.
- [ ] Works at 400 px wide, one-handed, with no network.
- [ ] No data-loss path introduced; existing stored data still loads (migration if the shape changed).
- [ ] `qa-engineer` has a regression test for the specific bug or behaviour.
- [ ] If it gives training advice, `strength-coach` signed off.
- [ ] `docs/backlog.md` updated; a real decision recorded in `docs/decisions.md`.

---

## 6. Commands

```bash
# Run the app — just open the file, there is nothing to build
start index.html                      # Windows
```

Tests: open `tests.html` from `file://`. Deploy: follow `docs/deploy.md`, then `sh scripts/verify-deploy.sh`.
Offline proof: `node scripts/offline-check.mjs`. Node is at `C:\Program Files\nodejs` (not on the git-bash
PATH). Playwright is installed globally and is how every screen measurement in this repo was taken.
No `gh`, `vercel` or `supabase` CLI — GitHub via git, Vercel and Supabase via their REST APIs.

---

## 7. The programme is not ours to invent

`docs/context/handoff-brief.md` is the **source of truth** for the training programme, the diet, and
the decisions already made about both. Read it before touching anything that gives advice. It was
written by Chady's prior coaching conversation and its decisions are settled, not proposals.

What it fixes that the app currently doesn't encode:

| | |
|---|---|
| Rest periods | Power 2–3 min · hypertrophy 1–2 min · speed work 60–90 s |
| Speed work | 65–70% of the 3–5RM on that lift |
| Reduced volume (`cut: 1`) | Drop for **weeks 1–4**, then reintroduce **one exercise per session from week 5**, only if recovery holds. The app's all-or-nothing "Full volume" toggle does not express this |
| Calorie protocol | +0.2–0.3 kg/wk = correct · **flat** = add 200 kcal · **more than +0.5 kg** = cut 200 kcal. Note the app currently cuts above +0.35, which contradicts this |
| Week 6 test | Are top sets on row, bench, squat, deadlift above week 1? This is deliberate and the current stall check implements it correctly |
| Person | 180 cm, 85 kg (Sep 2026), bulking, 5 days/week, maintenance est. ~2,700 kcal |
| Prior system of record | `docs/context/phat-log.xlsx` — six tabs, chosen for durability. This app was built as the *optional* in-gym logger next to it |

Two hazards recorded there that must not be reintroduced:

- **`window.storage` and `localStorage` are two separate stores.** Never write to both. The adapter
  picks one at boot; any sync work must respect that or history will silently fork.
- **A top-level identifier named `top` collided with the read-only `window.top` global** and threw
  before any code ran — a black screen. That's why the helper is `topSet` and the whole script is an
  IIFE under `"use strict"`. Check any new top-level name against browser globals.

## 8. Working agreements with Chady

**Communication style — this is how the prior conversation ran and he asked for it explicitly:**

- **Lead with the uncomfortable answer.** No warm-up paragraph, no agreement opener.
- **Tag confidence:** `[Certain]` for hard evidence, `[Likely]` for strong inference, `[Guessing]`
  for gap-filling. Use these when making claims about training, diet or physiology.
- **Disagree with structure:** "I disagree because X. Here's what I'd do instead: Y. The risk in your
  approach is Z."
- **Hold position under pushback** unless given genuinely new information. "But I really think" is not
  new information.

**The standing diagnosis, to keep raising:** the training effort is the bottleneck, not the tooling.
The prior conversation produced four deliverables and zero logged sessions. This one has now produced
a repo, an agent team and a deployment — still zero logged sessions. If the next request is another
tool, another format, or another rebuild, say so plainly before building it. Then build it if he
reaffirms: it is his call, and it gets built properly or not at all.

**Other agreements:**

- He does not want to re-explain the project each session. That is what this file is for — it loads
  automatically every session. Keep it current. If a session establishes a durable fact, write it here
  (or in `docs/decisions.md`) before the session ends.
- Do not run `/init` on this project — it regenerates this file and would erase all of the above.
  `/start` is the session-opening skill.
- Prefer one recommendation over a menu of options. Say which and why.
- Flag when an ask conflicts with a constraint in section 3 instead of silently working around it.
