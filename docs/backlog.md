# Backlog

Owned by `project-manager`. Seeded from the first code review of `index.html` (2026-09-09).
Severity: **P0** = loses or corrupts data · **P1** = gives wrong advice or blocks real use ·
**P2** = real but survivable · **P3** = architecture debt.

Status: `open` · `in-progress` · `qa` · `done` · `wontfix`

---

## P0 — data integrity

| ID | Issue | Owner | Status |
|---|---|---|---|
| B-01 | **An in-progress session exists only in memory.** `S.draft` is never persisted. Reload, phone lock-and-kill, or an accidental back gesture loses the whole workout. This is the single worst bug in the app. Draft must autosave on every keystroke under its own key and be offered back on boot. | backend + frontend | open |
| B-02 | **Malformed numbers silently delete a set.** `syncSet` strips to `[\d.]` but allows `"7.5.0"`; `+"7.5.0"` is `NaN`, so `done()` filters the set out and `finish()` saves the session *without it*. No warning. The user sees their set vanish after saving. | backend + frontend | open |
| B-03 | **`today()` uses UTC.** `new Date().toISOString().slice(0,10)` returns the UTC date. Logging late at night or early morning writes the wrong calendar day, breaks "Done today", and can create two bodyweight rows for one day. Must use local date parts. | backend | open |
| B-04 | **Export with no import.** The UI says "Export once a month so nothing costs you the history" — but there is no way to load a backup back in. The backup is decorative. Add import with validation and a merge/replace choice. | backend + ux | open |

## P1 — wrong advice or blocked use

| ID | Issue | Owner | Status |
|---|---|---|---|
| B-05 | **No edit or delete of a saved session.** One fat-fingered `140` instead of `100` permanently distorts the trend chart, the stall detector and every future verdict, with no way to correct it. | frontend + backend | open |
| B-06 | **"7-day average" is not 7 days.** `b.slice(-7)` takes the last 7 *entries*. Log three times in three weeks and the "weekly average" spans three weeks, "change vs last week" compares two arbitrary blocks — and the app then tells you to change your calories by 200 kcal based on it. Must bucket by actual date windows and refuse to advise on thin data. | backend + strength-coach | open |
| B-07 | **Stall detector contradicts the program.** It compares `topSet` (weight only) against the all-time first session. PHAT progresses *reps* inside a range before adding weight — so the app will shout "no progress" at a user who is progressing exactly as the app's own `verdictFor` told them to. Detector must consider reps/estimated strength, and compare against a recent window, not session #1. | strength-coach + backend | open |
| B-08 | **Progression recommends off the top set.** `verdictFor` power branch uses `topSet(sets)` as the current load. Do 100/100/95 and it recommends 102.5 kg — based on a weight you did not hit on every set. Should key off the weight actually completed across the required sets. | strength-coach + backend | open |

## P2 — real but survivable

| ID | Issue | Owner | Status |
|---|---|---|---|
| B-09 | **No rest timer.** Power sets at 3–5 reps need 3–5 minutes. This is the most-used feature of every gym app and it's absent. Should start on set entry, survive backgrounding, and be per-exercise-type. | frontend + ux | open |
| B-10 | **No plate math.** "Go 102.5 kg" without telling you what to load per side. Cheap to add, used every session. | frontend + strength-coach | open |
| B-11 | **Chart spaces points by index, not by date.** A two-week layoff renders identically to back-to-back sessions, which makes the trend line misleading — the one thing a trend line must not be. | frontend | open |
| B-12 | **Speed-day percentage is static text.** "65–70% of your power-day top set" — the app already has that top set. Compute and show the actual kg. | frontend + backend | open |
| B-13 | **Accessibility.** `maximum-scale=1` blocks pinch-zoom (never do this); inputs have no labels; `−`/`+` buttons are unlabelled to a screen reader; up/down verdicts are conveyed by colour alone; toast and verdict have no `aria-live`. | ux + frontend | open |
| B-14 | **`fmt()` drops the year.** Ambiguous the moment history passes 12 months. | frontend | open |
| B-15 | **Duplicate SVG `marker` ids.** `ah_${pattern}` repeats when two diagrams of the same pattern are open — invalid DOM, tolerated today, will bite. | frontend | open |
| B-16 | **Blob download has no fallback.** `exportAll` relies on a synthetic `a.click()` that silently does nothing in some WebViews — including the native wrapper the `window.storage` bridge implies. Needs a clipboard/share fallback and a visible success state. | frontend + release | open |
| B-17 | **Can only log today.** No date picker, and `S.sessions` is never sorted — it relies on append order. Logging a missed session, or importing, breaks `lastFor()`'s "scan backwards" assumption. | backend + frontend | open |
| B-18 | **No deload or cycle awareness.** `weeksIn()` is computed but only used for a label and the stall check. PHAT is a structured program; the app should know where you are in it. | strength-coach + backend | open |

## P3 — architecture debt

| ID | Issue | Owner | Status |
|---|---|---|---|
| B-19 | Full `innerHTML` re-render per view. Fine today because render never fires mid-edit — but focus and caret position will be lost the moment a timer, live sync, or autosave indicator needs to re-render during input. Move to targeted updates before adding any of those. | frontend | open |
| B-20 | Logic and DOM are interleaved (`verdictFor` reads `S` via `lastFor`). Extract pure functions with explicit arguments so QA can test them without a browser. | backend | open |

---

## Epics

| ID | Epic | Notes |
|---|---|---|
| E-1 | **GitHub** — init repo, `.gitignore`, first commit, push, branch convention | release-engineer. Needs repo name + visibility from Chady. |
| E-2 | **Vercel** — connect the GitHub repo, static deploy of `main`, preview deploys on branches | release-engineer. No CLI needed; dashboard + the existing GitHub-linked account. |
| E-3 | **Supabase** — schema, RLS, auth, and a sync layer that never blocks logging | backend-engineer. Offline-first: local write wins during a workout, reconcile after. Do **not** start before B-01/B-02/B-03 are fixed — syncing corrupt data is worse than not syncing. |
| E-4 | **PWA** — manifest, icons, service worker, installable to the home screen, works with no signal | release-engineer. This is what makes it feel like an app instead of a bookmark. |

## Recommended order

1. B-01, B-02, B-03 — stop losing data. Nothing else matters until these are closed.
2. E-1, E-2, E-4 — get it on the phone and backed up by git. Fast, high morale payoff.
3. B-05, B-04 — make history correctable and restorable.
4. B-06, B-07, B-08 — make the advice honest. `strength-coach` leads.
5. E-3 — Supabase sync, once the local data model is trustworthy.
6. B-09, B-10, B-12 — the features actually used mid-workout.
7. Everything else.
