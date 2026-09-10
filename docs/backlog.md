# Backlog

Owned by `project-manager`. Seeded from the first code review of `index.html` (2026-09-09).
Severity: **P0** = loses or corrupts data · **P1** = gives wrong advice or blocks real use ·
**P2** = real but survivable · **P3** = architecture debt.

Status: `open` · `specified` · `in-progress` · `qa` · `done` · `wontfix`
`specified` = a work order exists with acceptance criteria; no code written yet.

Work orders live in `docs/work-orders/`.

| WO | Covers | Status |
|---|---|---|
| [WO-001](work-orders/WO-001-p0-data-loss.md) | B-01, B-02, B-03, B-21 | merged and deployed |
| WO-002 (planned) | B-04 + B-16 — the backup round trip | not written |
| [WO-003](work-orders/WO-003-advice.md) | B-30, B-17(sort), B-24, B-08, B-25, B-06, B-07, B-22, B-12, B-23, B-26, B-09, B-18 + B-32, B-20, B-33, B-38, B-27, B-28, B-41, B-42 | **engine half built and signed off** (W1/W2/W5/W6/W7/W9/W12/W14/W19/W21). Frontend half — W3/W4 specs written; W8/W10/W11/W13/W15/W16/W17/W18/W20 **held for the redesign**. |

**Suite tripwire.** `tests.html` is **`347 / 347 / 0`** on `wo-003-advice` (was 148/147/1 on `main`). 134 of those cover the nine rule engines; 12 of 13 injected mutants were killed and the survivor was proved an equivalent mutant, not a coverage hole.
**Zero expected failures is enforced by the suite itself** — two meta-tests fail on any `known bad` /
`xfail` test name, or on any skip without a stated reason. The earlier `N ≥ 236` target is superseded: it
assumed a frontend that is now deliberately on hold.

**Signatures in WO-003 are stale; the code is right.** `volumeTier` and `deloadCheck` take a context
object (the positional lists could not satisfy their own criteria) and `stallReport` takes a fourth
`state` argument that Rule E2 requires and no document specifies. PM to restate — do not "fix" the code
back to the work order.

---

## P0 — data integrity

| ID | Issue | Owner | Status |
|---|---|---|---|
| B-01 | **An in-progress session exists only in memory.** `S.draft` is never persisted. Reload, phone lock-and-kill, or an accidental back gesture loses the whole workout. This is the single worst bug in the app. Draft must autosave on every keystroke under its own key and be offered back on boot. | backend + frontend | **done — WO-001, merged and deployed** |
| B-02 | **Malformed numbers silently delete a set.** `syncSet` strips to `[\d.]` but allows `"7.5.0"`; `+"7.5.0"` is `NaN`, so `done()` filters the set out and `finish()` saves the session *without it*. No warning. The user sees their set vanish after saving. | backend + frontend | **done — WO-001, merged and deployed** |
| B-03 | **`today()` uses UTC.** `new Date().toISOString().slice(0,10)` returns the UTC date. Logging late at night or early morning writes the wrong calendar day, breaks "Done today", and can create two bodyweight rows for one day. Must use local date parts. | backend | **done — WO-001, merged and deployed** |
| B-04 | **Export with no import.** The UI says "Export once a month so nothing costs you the history" — but there is no way to load a backup back in. The backup is decorative. Add import with validation and a merge/replace choice. | backend + ux | open — **WO-002**, with B-16. **New constraint from WO-003:** the importer must accept `schemaVersion` **2 and 3**. |
| B-21 | **A 0 kg set is silently deleted.** `done()` requires `+s.w>0`, so a rack chin or unweighted dip logged as `0 × 10` disappears on save. Same failure mode as B-02, different trigger. | backend | **done — WO-001, merged and deployed.** Advice-layer sibling B-32 is open. |

## P1 — wrong advice or blocked use

| ID | Issue | Owner | Status |
|---|---|---|---|
| B-05 | **No edit or delete of a saved session.** One fat-fingered `140` instead of `100` permanently distorts the trend chart, the stall detector and every future verdict, with no way to correct it. | frontend + backend | open — **severity rises with WO-003**: nine rules now read that history and act on it confidently. First in the queue behind WO-002. |
| B-06 | **Bodyweight rate uses entry count, not dates — and the calorie bands contradict the brief.** `b.slice(-7)` takes the last 7 *entries*, which can span a month. Separately and independently, the bands are wrong: the app cuts 200 kcal above +0.35 kg/wk where the brief says do nothing below +0.5, triggers "add" below +0.2 where the brief says *flat*, and prints "Gaining too slowly" when you are actually **losing**. The panel also prints "Target: 0.2–0.3" under logic using 0.35. Spec: **Rule W1**. Acceptance: 8 entries over 24 days shows **no** rate and **no** advice. | backend + strength-coach | **specified — WO-003 W7 (engine) + W8 (Weight tab)** |
| B-07 | **Stall detector measures weight only, and never re-baselines.** ~~Compares against the all-time first session~~ — struck: that *is* the brief's week-6 protocol, deliberately. The real defects: it reads `topSet`, so week 1 `100×3/3/3` → week 6 `100×5/5/5` reports no progress and blames intensity or diet, punishing the user for obeying the app; and the baseline never rolls forward, so by week 30 it can never fire. Fix: estimated 1RM over two rolling 21-day blocks. Spec: **Rule ST1**. Acceptance: that 3/3/3 → 5/5/5 case produces **no** warning. | strength-coach + backend | **specified — WO-003 W9 (ST1) + W10 (Trend tab)** |
| B-08 | **Progression recommends off the top set.** `verdictFor` power branch uses `topSet(sets)` as the current load. Do 100/100/95 and it recommends 102.5 kg — based on a weight you did not hit on every set. Working load is the `min` of the first `ex.s` completed sets. Spec: **Rule P1**. Acceptance: `100/100/95` at 5/5/5 never recommends 102.5 kg. | strength-coach + backend | **code on `wo-003-advice` — WO-003 W6.** `PHAT.verdict` uses `min` of the first `ex.s` completed sets; `100/100/95` renders the not-matched copy. Awaiting QA (W21) and coach sign-off on the seven calls in `decisions.md`. |
| B-22 | **Dumbbell load unit is undefined.** The app never states whether a DB weight is per dumbbell or per pair. Makes the "Bench" trend line uninterpretable and blocks B-10 and B-12. Ruled: **per dumbbell**, stated in the target line. No migration needed — no data logged yet. | strength-coach ✅ · frontend | **specified — WO-003 W11.** Implement tags ruled in W2. **Blocks W12/SP1** (WO-003 §H6). |
| B-23 | **"Full volume" checkbox misrepresents the programme.** An all-or-nothing toggle cannot express the brief's ramp: drop ✂ for weeks 1–4, then reintroduce **one accessory per session from week 5**, only if recovery holds. Replace with a per-day reintroduction counter and a weekly gated offer, rolled back automatically when the stall detector fires. Spec: **Rule V1**. | frontend + backend | **specified — WO-003 W14 (engine) + W15 (UI).** Needs B-30 and B-07 first (§H1, §H7). |
| B-24 | **Verdicts fire mid-exercise.** `paintVerdict` runs on every keystroke, so one completed set of three prints `Volume down 66%. Add a rep or 2.5 kg next time.` while the user is still working. Gate every verdict on `completed sets >= ex.s`. Cheapest correctness win in the app. | frontend + backend | **code on `wo-003-advice` — WO-003 W5.** `PHAT.verdict` returns `null` below `ex.s` completed sets, and `paintVerdict` now runs on commit only (stepper tap, focusout, clear, first paint), never on `input`. Awaiting QA. |
| B-25 | **Hypertrophy verdict ignores the rep range.** Compares tonnage only, so 3×20 on an 8–12 exercise scores as progress. Spec: **Rule H1**. | strength-coach ✅ · backend | **code on `wo-003-advice` — WO-003 W6.** Range compliance first (H1 cases 1-2), then Z3's basis test, then tonnage. Awaiting QA. |
| B-32 | **A saved 0 kg set reads back as "Stay at 0 kg".** B-21 is genuinely fixed in the data layer — a rack chin stores as `w:0` — but `topSet()` still filters `+s.w>0`, so the verdict says `Stay at 0 kg until all 3 sets reach 10 reps`. Wrong advice on correct data. `tests.html` carries this as a KNOWN-BAD test that documents the wrong output and asserts only that storage stays right. **Do not close it by dropping the set again.** | strength-coach → backend | **code on `wo-003-advice`: Z1/Z2 implemented, `0×10, 0×9` on d1c now renders `Stay at bodyweight until all 2 sets reach 10 reps.` and no rule can produce the string `0 kg`. The 42 implement tags (Rule I1) shipped with it, data only. Was: WO-003 W2 (ruling) → W6 (code) → W21 (the KNOWN-BAD test is rewritten, not deleted).** The audit's literal `completed = w > 0` would reintroduce B-21 one layer up — see WO-003 §H3. `lastFor`'s `+x.w>0` is the same bug and is fixed in W1. |
| B-26 | **Pain is collected and ignored.** The note placeholder invites "RIR, form, pain, anything" and the app then recommends +2.5 kg regardless. Suppress load increases and show a fixed referral line. Not the app's call to assess. Spec: **Rule S1**. | ux + backend | **specified — WO-003 W16 + W17.** The suppression *mechanism* moves earlier, into W5/W6 — see §H4. |

## P2 — real but survivable

| ID | Issue | Owner | Status |
|---|---|---|---|
| B-09 | **No rest timer.** Per the brief: **power 2–3 min · hypertrophy 1–2 min · speed work 60–90 s.** The most-used feature of every gym app and it's absent. Must store an absolute timestamp so it survives backgrounding, and must never block or delay a set save. Spec: **Rule R1**. Needs B-19 first. | frontend + ux | **specified — WO-003 W18.** Gets a **narrow** render-free `textContent` seam, not a B-19 fix. If that seam cannot be built cleanly, R1 is the first item cut from the batch (§H5). |
| B-10 | **No plate math.** "Go 102.5 kg" without telling you what to load per side. Blocked by B-22 (dumbbell unit); scope to barbell exercises. | frontend + strength-coach | open — **unblocked by WO-003 W11**, but not built there. Needs its own work order. |
| B-11 | **Chart spaces points by index, not by date.** A two-week layoff renders identically to back-to-back sessions, which makes the trend line misleading — the one thing a trend line must not be. | frontend | open |
| B-12 | **Speed-day percentage is static text.** "65–70% of your power-day top set" — and "top set" is not a 3–5RM, so the current copy is wrong as well as inert. Compute the kg from the heaviest set at 3–5 reps on the mapped power lift within 28 days, widening to 56, else stay silent. Spec: **Rule SP1**. Blocked by B-22. | frontend + backend | **specified — WO-003 W12 (engine) + W13 (card).** Cannot ship before B-22/W11 (§H6). |
| B-13 | **Accessibility.** `maximum-scale=1` blocks pinch-zoom (never do this); inputs have no labels; `−`/`+` buttons are unlabelled to a screen reader; up/down verdicts are conveyed by colour alone; toast and verdict have no `aria-live`. | ux + frontend | open |
| B-14 | **`fmt()` drops the year.** Ambiguous the moment history passes 12 months. | frontend | open |
| B-15 | **Duplicate SVG `marker` ids.** `ah_${pattern}` repeats when two diagrams of the same pattern are open — invalid DOM, tolerated today, will bite. | frontend | open |
| B-16 | **Blob download has no fallback.** `exportAll` relies on a synthetic `a.click()` that silently does nothing in some WebViews — including the native wrapper the `window.storage` bridge implies. Needs a clipboard/share fallback and a visible success state. | frontend + release | open — **pulled into WO-002 with B-04**: an export that can't download and can't re-import is one broken round trip |
| B-17 | **Can only log today, and sessions are never sorted.** No date picker, and `S.sessions` relies on append order, so `lastFor()`'s scan-backwards assumption breaks on any import or backdated entry. **Raised toward P1:** `weeksIn()` reads `S.sessions[0].date` on that unsorted array, and the volume tier, stall test and deload trigger now all gate on a week number. | backend + frontend | **split.** Sorting half: **specified — WO-003 W1**. Date-picker / backdating half: **still open**, unscheduled. |
| B-18 | **No cycle awareness; deload is autoregulated, not scheduled.** Ruled: this programme should **not** get a calendar deload — the ✂ block already is the ramp, and a scheduled deload would put a third of the first 12 weeks at reduced stimulus. Deliver the cycle display first (`Week 7 · full volume phase · 4 of 9 accessories back`), autoregulated triggers second. Spec: **Rule D1**. | strength-coach + backend | **specified — WO-003 W19 (engine) + W20 (banner + cycle line).** Last in the batch; reads B-07 and B-23 output. Second item cut if the batch has to shrink. |
| B-27 | **`KEY_LIFTS` labels are wrong.** "Bench" is a flat DB press; "Deadlift" is a stiff-leg deadlift. The mapping is right, the labels lie. Rename to `DB press` and `SLDL`. | frontend | **specified — WO-003 W10.** Rides along because ST1's new copy names these lifts. |
| B-28 | **`d1a` is named "Bent-over row"**; the brief says "Bent-over or Pendlay row". | frontend | **specified — WO-003 W10.** Rides along because SP1's fallback copy interpolates this name. |
| B-29 | **Diet targets are never displayed.** The app says "add 200 kcal to your training days" without ever showing what the training-day target is. Static panel on the Weight tab: 3,200/170/300/145 training, 2,500/175/60/175 rest, creatine 5 g. | ux + frontend | open |
| B-30 | **`trainingWeeks` does not exist.** `weeksIn()` counts calendar weeks from session one. Rules V1, ST1 and D1 all need "weeks containing ≥ 3 logged sessions". Pure function, testable. | backend | **specified — WO-003 W1.** First item in the batch: every week-gated rule inherits its answer (§H1). |

## P3 — architecture debt

| ID | Issue | Owner | Status |
|---|---|---|---|
| B-19 | Full `innerHTML` re-render per view. Fine today because render never fires mid-edit — but focus and caret position will be lost the moment a timer, live sync, or autosave indicator needs to re-render during input. Move to targeted updates before adding any of those. | frontend | open — **constrains WO-001 W5**: autosave must never call `render()`, and no autosave indicator until this is fixed. **WO-003 W18 does NOT fix it** — the rest timer gets one narrow `textContent` channel that never calls `render()`, and B-19 stays open at full scope. |
| B-39 | **A full disk stops the draft saving and says nothing.** Fill storage, keep typing: the draft on disk stays frozen and nothing on screen changes. `saveDraft()` does set `S.err`, but the autosave path is forbidden from calling `render()` (B-19) and nothing else paints it — so he only finds out when he taps Save. Everything typed after the disk filled is lost if the phone dies first. Not a regression (there was no draft at all before WO-001), but it is the one remaining hole in "an in-progress session must survive a phone lock". **Fix: `announce()` already writes to `#bs-live`, which lives outside `#view` — a render-free channel that violates neither B-19 nor the no-autosave-indicator rule.** | frontend | open |
| B-40 | **The draft notice overwrites the more serious store notice.** With site data blocked, boot sets the log-read notice then unconditionally reassigns it for the draft, so the only message shown is "Could not read your saved session. Close the app and reopen it." Meanwhile `blockWrites[LOG]` is silently true, and the advice cannot work when storage is blocked at the browser level. The worst fact should win. | frontend | open |
| B-41 | **W5 criterion 3 overstates the guarantee.** It says at most one in-flight keystroke is at risk; observed, it is the whole field — every keystroke resets the 400 ms debounce, so a field that has never been blurred or stepped is absent from disk until 400 ms after the *last* keystroke. Bounded and small (the field under his thumb; moving on blurs and flushes), but the criterion is what the next change gets measured against. Either restate it or also flush on the first keystroke into an empty field. | project-manager or frontend | **done — restated in WO-003 §Decision 8**, and WO-003 W18 additionally flushes on the first keystroke into an empty field. |
| B-42 | **"`750` unreachable by any route" is false for deletion.** Paste `7.5.0`, backspace twice → `750` on screen. Deletions pass through verbatim by design, and correctly so — stripping them would trap him in a value he cannot edit out of. It can never be *saved* (`750 > 500`). Near-miss worth noting: one backspace gives `75.0`, which saves as `75` and IS in range — visible on screen first, so an editing outcome, not a silent rewrite. **Restate the claim; do not change the code.** | none | **done — restated in WO-003 §Decision 8.** No code change. |
| B-38 | **`buildSession` coerces a non-string `dayId`** instead of returning null as its own doc comment promises: `0` becomes `"0"`, `{}` becomes `"[object Object]"`. Unreachable from the UI today, but it is a defence-in-depth hole in the one function whose job is to refuse rather than guess — a session under an unmatched `dayId` renders as "Session" with its entries unreachable. `tests.html` carries this as a deliberately FAILING test. | backend | **specified — WO-003 W1, rides along.** Rationale (§Decision 1): "expect exactly one failure" is a rule applied from memory, and it is how a second, real failure gets waved through. After the batch the tripwire is `0`. |
| B-44 | **`Intl` renders "Sept", the signed-off copy says "Sep" — two date formats in one app, today.** On current ICU (Node 24, recent Chrome) `en-GB` short month is **`Sept`**, so `index.html`'s `fmt()`/`dstr()` already print `7 Sept` on a modern device, while the coach-approved string is `Hold until 16 Sep`. W7's `dayMon` uses a fixed month table to match the copy; the shipped formatters do not. **This partially reopens B-35** — pinning `en-GB` fixed the day/month *order* but not the month *spelling*, which I did not anticipate when I ruled it. Pick one source of truth for month names and route both through it. | frontend | open |
| B-43 | **Controls below the 44 px minimum, measured at a true 400 px viewport.** The stepper `−`/`+` buttons are **40 px across** — the 46 px figure everyone quotes is their *height*, and the width was never checked. `.showfig` ("movement & cue") is **26 px tall**. These are the two controls used most during a set, by a thumb, with chalk on it. CLAUDE.md §3.6 makes 44 px a hard constraint, so this is a defect, not a nicety. | frontend + ux | open — **for the redesign** |
| B-37 | **The ghost text is invisible at the target width.** At 400 px a `.setrow` measures 369 px inside a 366 px `.sets` content box, so the last-session `100×5` hint is squeezed to zero width — on unmarked rows too, so this is pre-existing, not introduced by W6. The single best feature in the app does not render on the phone it was designed for. Measured, with a screenshot. | frontend + ux | open — **P1 in effect** |
| B-34 | **`Discard` sits in the top-right corner** of the session header — against CLAUDE.md §3.6 ("nothing important in the top corners"), and it is the most destructive control in the app. W5 gave it a confirmation and a 44 px target, which makes it survivable, not correct. Moving it is a session-view layout change and was out of W4/W5 scope. | ux + frontend | open |
| B-35 | **Date formatting is locale-driven and now inconsistent.** `toLocaleDateString(undefined, …)` renders `Monday, Sep 7` on a US-locale device where the spec and the handoff brief both write `Tuesday, 7 Sep`. W5's new strings are pinned to `en-GB`; the older `fmt()` is not. Pin `fmt()` too so one screen cannot show two orderings. | frontend | open |
| B-36 | **`#dock` is now `position:fixed`, untested with a software keyboard.** W5 had to make the bottom nav viewport-fixed so the restore sheet was not painted below the fold. On iOS Safari a focused input can lift fixed elements out of place — needs checking on a real phone with the keyboard up on the session view. Desktop and headless are clean. | frontend | open — needs a real device |
| B-33 | **A notes-only entry inflates the exercise count.** `validateDraft` correctly keeps an entry that has a typed note and no sets — a note is data. But `vTrend` counts entries, so "N exercises" reads one too high. Display-only; fix in the view, **not** by deleting the note. Pinned in `tests.html` as a judgement call. | frontend | **specified — WO-003 W10, ruled in §Decision 7:** an exercise counts when it has ≥ 1 completed set; a notes-only entry is surfaced separately (`5 exercises · 1 note`), never hidden and never deleted. |
| B-31 | Weekday not shown on the day buttons, though the brief fixes them: Mon upper power, Tue lower power, Thu back & shoulders, Fri lower hypertrophy, Sat chest & arms. | frontend | open |
| B-20 | Logic and DOM are interleaved (`verdictFor` reads `S` via `lastFor`). Extract pure functions with explicit arguments so QA can test them without a browser. | backend | **code on `wo-003-advice`: W5 closed the remainder.** `verdictFor`, `lastFor`, `vol`, `topSet` and `done` are gone from `index.html`; the rules are `PHAT.verdict`, `PHAT.vol`, `PHAT.topSet`, `PHAT.round2p5`, `PHAT.workingLoad`, `PHAT.e1rm`, `PHAT.painFlag`, `PHAT.loadWord`, `PHAT.incrementLine`, `PHAT.g1Step`, `PHAT.completedSets` — all callable from `file://` with no DOM. Original entry: Extraction and rule change happen in ONE pass, per §Decision 2: W5 creates the seam with the gate, W6 fills it. No test pins current advice behaviour. After the batch every audit rule must be callable as `PHAT.<fn>` from `file://`. **Partially done by WO-001**: `logic.js` + `window.PHAT` created, holding the date, validation and migration functions. `verdictFor`/`lastFor`/`vol`/`topSet` deliberately left alone; they get extracted in the coach batch (B-06/07/08) so the extraction and the rule change happen once. **Two more extractions requested by QA**, because the storage layer is the most valuable behaviour in WO-001 and none of it is reachable from `tests.html` (an iframe is dead on a `file://` opaque origin): `PHAT.classifyDraftPayload(raw)` → `{status, draft, reason}`, which makes `none`/`parse`/`shape` testable and leaves only `read` manual; and `PHAT.buildSession(draft, dayId, dateStr, id)` returning the exact object handed to `save()`, so W2's "assert on the serialized JSON" criterion stops being proxied through `validateDraft().entries`. |

---

## Epics

| ID | Epic | Notes |
|---|---|---|
| E-1 | **GitHub** — init repo, `.gitignore`, first commit, push, branch convention | release-engineer. Needs repo name + visibility from Chady. |
| E-2 | **Vercel** — connect the GitHub repo, static deploy of `main`, preview deploys on branches | release-engineer. Live already, but deployed by API and **not git-linked**, so every release is a manual upload. WO-001 adds a second file (`logic.js`), and a partial manual upload is a black screen — this is now the cheapest risk reduction available. Recommend doing it immediately after WO-001. |
| E-3 | **Supabase** — schema, RLS, auth, and a sync layer that never blocks logging | backend-engineer. Offline-first: local write wins during a workout, reconcile after. Do **not** start before B-01/B-02/B-03 are fixed — syncing corrupt data is worse than not syncing. |
| E-4 | **PWA** — manifest, icons, service worker, installable to the home screen, works with no signal | release-engineer. This is what makes it feel like an app instead of a bookmark. |

## Recommended order

1. ~~B-01, B-02, B-03, B-21~~ — **done. WO-001 merged and deployed.** The 17-item manual checklist is
   still owed on the phone.
2. E-2 — git-link Vercel, so a two-file release stops being a manual upload that can half-fail.
3. B-04 + B-16 — the backup round trip, in one pass. **WO-002.** Reuses WO-001's validators and
   `schemaVersion`, which is why it waits.
4. E-1, E-4 — get it on the phone and installable. Fast, high morale payoff.
5. B-05 — make history correctable.
6. **The advice batch — [WO-003](work-orders/WO-003-advice.md), written and specified.**
   `strength-coach` ruled on all of it in `docs/coach-audit.md`. Closes B-20, B-32, B-33, B-38, B-27,
   B-28, B-41 and B-42 in the same pass. Order, from the audit:
   B-30 + B-17(sort) → B-24 → B-08 + B-25 → B-06 → B-07 → B-22 → B-12 → B-23 → B-26 → B-09 → B-18.
   **One deviation:** the S1 pain *mechanism* moves earlier, into the verdict seam, so no build ever
   makes a confident load recommendation without it (WO-003 §H4).
   **If the batch has to shrink, cut from the end:** B-09 (rest timer), then B-18 (deload). Neither is
   a wrong-advice fix. Everything before them is.
7. E-3 — Supabase sync, once the local data model is trustworthy.
8. B-29, B-31 — diet panel and weekday labels. Cheap, do them alongside anything. (B-27 and B-28 ride
   in WO-003 W10 — the new advice copy names those lifts.)
9. Everything else.

## Note on numbering

`B-21` is WO-001's zero-weight defect. The `strength-coach` audit proposed its own `B-21`–`B-30`;
those were renumbered to **B-22–B-31** on merge. If you are reading `docs/coach-audit.md` directly,
its "PROPOSED BACKLOG CHANGES" table uses the old numbers — this file is authoritative.
