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
- **Repo:** `https://github.com/chadyantoun-ux/Gym-App` (`main`).
- **Live:** `https://gym-app-psi-eight.vercel.app` — Vercel project `gym-app`, static, no build.
  Deployed via API on 2026-09-09. **Not yet git-linked**: the Vercel GitHub App has to be installed on
  the repo before pushes auto-deploy. Until then a deploy is a manual API call, so `main` and the live
  site can drift — check before assuming what's deployed.
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
