# Phat Gym Track

A personal training log for a PHAT (Power Hypertrophy Adaptive Training) program. Built to be used on
a phone, in a gym, one-handed, between sets.

- Five program days with fixed set/rep targets, power / hypertrophy / speed roles
- Stepper-based set entry (2.5 kg steps) with last session's numbers shown inline
- Per-exercise progression verdicts — when to hold and when to add weight
- SVG movement diagrams with a form cue for every exercise
- Top-set trend chart for row, bench, squat and deadlift
- Bodyweight tracking with a weekly-average based calorie nudge
- Works offline; data stored on the device; JSON export

## Run it

Open `index.html` in a browser. There is no build step and no dependencies.

```bash
start index.html     # Windows
```

## Stack

| | |
|---|---|
| App | One static HTML file — vanilla JS, inline CSS, hand-built SVG, no framework, no build |
| Storage | `localStorage` today; Supabase (Postgres + RLS) planned for sync and backup |
| Hosting | Vercel, static, auto-deployed from GitHub `main` |

## Working on this

Read **`CLAUDE.md`** first — it holds the constraints, conventions and the agent workflow. Every
request goes through the `project-manager` agent before any code is written.

| Document | What's in it |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Constraints, conventions, agent roster and routing, definition of done |
| [docs/backlog.md](docs/backlog.md) | Known defects and planned work, prioritised |
| [docs/architecture.md](docs/architecture.md) | Current and target architecture, schema sketch |
| [docs/decisions.md](docs/decisions.md) | Decision log — why things are the way they are |

The four constraints that matter most: **no build step**, **works offline**, **never lose a logged
set**, **local dates not UTC**.
