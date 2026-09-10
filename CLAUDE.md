# Phat Gym Track

Personal training log for a PHAT (Power Hypertrophy Adaptive Training) program. One user: Chady.
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

## 2. Current state

- `index.html` — the entire app today. ~700 lines: vanilla JS in one IIFE, inline CSS, no dependencies,
  no build step. Data lives in `localStorage` under `phat:v1:log` and `phat:v1:bw`.
- There is **no backend yet.** `backend-engineer`'s near-term scope is the data layer inside the app
  (schema, validation, migrations, pure progression/analytics functions) plus standing up Supabase.
- Known defects and planned work are in `docs/backlog.md`. Read it before proposing work.

### Target stack (decided, not yet built)

| Layer | Choice |
|---|---|
| Source control | GitHub, `main` is deployable at all times |
| Hosting | Vercel, auto-deploy from GitHub `main`, static — **no build step** |
| Database | Supabase (Postgres) with Row Level Security |
| Auth | Supabase Auth, single user |
| Client | Vanilla JS; `@supabase/supabase-js` loaded from CDN (ESM), not npm |
| Offline | localStorage stays the source of truth during a workout; Supabase is sync + backup |

Rationale and alternatives in `docs/architecture.md`. Decisions log in `docs/decisions.md`.

---

## 3. Hard constraints

These are not preferences. Violating one is a defect.

1. **No build step.** No bundler, no transpiler, no framework. Node is not installed on this machine.
   Anything that requires `npm run build` to view the app is rejected. Load libraries from CDN as ESM.
2. **Offline-first.** The gym has no signal. A workout must be fully loggable with the network off.
   Network writes are best-effort sync on top of local storage, never a precondition for logging.
3. **Never lose a number.** Data loss is the only P0 class of bug. An in-progress session must survive
   a reload, a phone lock, a browser kill, and a failed save.
4. **Local dates, never UTC.** `new Date().toISOString()` for a calendar date is a bug — it shifts the
   day for anyone not on UTC. Use local date components.
5. **Units are kg**, steps of 2.5 kg for weight and 0.1 kg for bodyweight.
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

No test runner yet; `qa-engineer` owns standing one up as a browser-based harness (`tests.html`),
because Node is not available. Git is installed; `gh`, `vercel`, and `supabase` CLIs are not —
GitHub and Vercel are wired through their web dashboards, which is sufficient for a static site.

---

## 7. Working agreements with Chady

- He does not want to re-explain the project each session. That is what this file is for — it loads
  automatically every session. Keep it current. If a session establishes a durable fact, write it here
  (or in `docs/decisions.md`) before the session ends.
- Prefer one recommendation over a menu of options. Say which and why.
- Flag when an ask conflicts with a constraint in section 3 instead of silently working around it.
