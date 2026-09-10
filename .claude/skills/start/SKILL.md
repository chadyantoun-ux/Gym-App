---
name: start
description: Open a working session on Phat Gym Track — load the project context, report current state and what's next, and route the user's ask to the project-manager agent. Use when the user types /start, or says "let's work on the app", "where were we", "what's next", or opens a session with an ask but no context.
---

# Start a session on Phat Gym Track

Chady does not want to re-explain this project. Everything needed is already on disk. Load it, tell him
where things stand, and get straight to work.

## Do this, in order

**1. Read the context.** `CLAUDE.md`, `docs/backlog.md`, `docs/decisions.md`. Do not skim — the
constraints in `CLAUDE.md` §3 and the open P0s in the backlog change what you're allowed to propose.

**2. Check the actual state of the repo** rather than assuming:

```bash
git -C "C:/Users/Chady/Desktop/Phat Gym Track" status --short 2>/dev/null || echo "not a git repo yet"
git -C "C:/Users/Chady/Desktop/Phat Gym Track" log --oneline -5 2>/dev/null
```

**3. Report, briefly.** Six lines at most:
- Open P0s, by ID and one-line title.
- What's in progress or was last finished.
- The next recommended item from the backlog's "Recommended order", and why it's next.
- Anything blocked waiting on Chady (a repo name, a Supabase URL, a decision).
- Uncommitted changes, if any.

**4. Route his ask.** If he came with a request, hand it to the `project-manager` agent — that is the
rule in `CLAUDE.md` §1, and it applies to small asks too. Pass along the relevant backlog IDs and
constraints so the PM doesn't start from zero. Then dispatch the specialists the PM's work order names.

If he came with no specific ask, recommend the next backlog item and ask whether to start it. One
recommendation, not a menu.

## Keep the files current

This is the part that makes the next session cheap. Before the session ends, or whenever something
durable is established:

- A decision that a future session would otherwise re-argue → `docs/decisions.md`.
- A new defect, or a status change → `docs/backlog.md`.
- A new constraint, convention or agreement → `CLAUDE.md`.
- Something about how Chady wants to be worked with → memory.

A session that discovers something durable and doesn't write it down has failed at the one thing this
setup exists for.

## Note on `/init`

`/init` is a built-in that **regenerates `CLAUDE.md` from scratch** by analysing the codebase — running
it would overwrite the hand-written constraints, agent routing and working agreements in the current
file. Don't run it on this project, and don't suggest it. `CLAUDE.md` loads automatically at the start of
every session, so no command is needed for context; use `/start` when you want the state report too.
