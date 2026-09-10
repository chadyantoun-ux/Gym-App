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
