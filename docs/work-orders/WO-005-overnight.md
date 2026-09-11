# WO-005 · The overnight run

Author: `project-manager` · Date: 2026-09-11 · Branch: `wo-004-redesign` @ `b4f031c`
Status: **execution plan, not a new work order.** It sequences what WO-004 already specified
(W1–W17) plus three defects found tonight. No acceptance criterion here replaces a WO-004 one —
where this file names a criterion it is a *gate on the night*, not a new contract.

---

## 0. Ask

Chady is asleep and asked for the app to be "fully developed and operational" when he wakes.
This file says what that means concretely, in what order it gets built, what gets cut when the
night runs out, what to do about the five things he alone can unblock, and what makes the run stop.

**The uncomfortable answer first, on the record and unchanged:** this is the fourth tool built for a
programme with **zero logged sessions**. Shipping a finished app tonight does not move the thing that
is stuck. The right morning message is not "it's done", it is "it's done, log Upper Power today."
That sentence goes in the wake-up note regardless of how much of this plan lands.

---

## 1. Verification of the stated state — three corrections

I checked rather than trusted. Three things in the brief are wrong or incomplete, and two of them
change the order of the night.

### 1.1 CONFIRMED as stated

- `main`'s HEAD is not this branch; `wo-004-redesign` @ `b4f031c` is the working branch. Working tree
  has exactly one modified file, `index.html` — the figures agent, as described.
- `vTrain` (`index.html:958`), `vTrend` (`:1219`), `vWeight` (`:1257`) are the old pre-redesign views.
  `vDiet` (`:1317`) and `vPlan` (`:1319`) are `vTodo` placeholders.
- `vSession` (`:1054`) **is** the new W7 screen — it calls `PHAT.deloadEx`, `prescriptionEpoch`,
  `extraSets`, `speedLoad`, `volumeTier`, has `pipStrip`, the B-37 full-width ghost row, `EXTRA`
  badges and an undo-set control. W7 landed.
- There is **no `vSummary`**. W8 is not built. Saving happens through the old `finish()` at `:2605`.
- PWA is unwired: `index.html` contains no `serviceWorker` registration and no `<link rel=manifest>`.
- `assets/archivo-inline.css` exists (47 KB) and `sw.js` precaches it.
- `d2e` in the **plan document** is already resolved: `Lying leg curl`, `implement:"machine"`.
- `d3d` in the plan document still reads `DB row or shrug` — the forbidden slash-name, confirmed.

### 1.2 **NEW — B-66 · `index.html` has its own `PROGRAM`, and it contradicts the plan document**

`index.html:508` declares a full 42-slot `PROGRAM` array. `logic.js` declares `PHAT.PHAT_PLAN`. The
screens read `PROGRAM`; the engines are handed `PHAT_PLAN`. They have diverged:

| | `index.html` `PROGRAM` | `logic.js` `PHAT_PLAN` |
|---|---|---|
| `d2e` name | `Glute-ham raise or lying leg curl` | `Lying leg curl` |
| `d2e` implement | `bodyweight` | `machine` |
| `cue` | **absent on all 42 slots** | present on 43 |
| `lift` | absent | present |
| `wd` weekday | absent | present on all 5 days |
| `KEY_LIFTS` labels | `Bench`, `Deadlift` (B-27) | — |

Consequences, all live right now:

1. The session screen still shows a **forbidden slash-name** and calls the lying leg curl
   `bodyweight` — which flips Rule Z2's load word and switches Rule I2's increment line **off** on a
   machine exercise. Wrong advice, shipped, today.
2. **None of the 42 signed-off cues can render.** Commit `ca5e5ae` says so in its own message
   ("flag that nothing renders them yet"). The coach's largest recent deliverable is unreachable.
3. B-31 (weekday labels) and W10's `lift` grouping cannot be built until the screens read the plan.
4. Two sources of truth for the programme is exactly the class of thing `decisions.md`
   2026-09-10 ("No slot id survives in code outside the plan document") already ruled against.

**This is the highest-value item of the night and it is small.** It goes first on the serial chain,
immediately after the figures land, and everything downstream (W9, W10, the figures' own cue slots)
depends on it. Filed as **B-66**, P1, owner `frontend-engineer`.

### 1.3 **NEW — B-67 · Archivo is inlined but never linked**

`assets/archivo-inline.css` is in the repo and precached by `sw.js`, but `index.html` contains no
`<link>` to it and no `@import`. B-63 is half-done: the asset shipped, the typeface did not. Every
44 px / 200 % / contrast measurement in W6 and W7 was therefore taken on the **fallback stack**, not
on the face the app will actually render in.

Consequence for sequencing: the link must go in **early**, in the same serial slot as B-66, so the
rest of the night measures once against the real typeface rather than twice. Filed as **B-67**, P2.

### 1.4 **NEW — B-68 · The manifest names icons that do not exist**

`assets/README-icons.md` says Chady is drawing them. `manifest.webmanifest` references them. An
install prompt with missing icons is a degraded install. Handled in §4.6. Filed as **B-68**, P3.

---

## 2. The constraint that shapes everything: one file, one writer

`index.html` is 2,743 lines and every remaining screen lives in it. Agents share one working tree.
**Only one agent may hold `index.html` at a time, and the main session must verify
`git status --short` shows it clean before dispatching the next holder.**

Separate files, safe to run in parallel with the `index.html` chain and with each other:

| File | Sole owner for the night |
|---|---|
| `logic.js` | `backend-engineer` |
| `tests.html` | `qa-engineer` |
| `sw.js`, `manifest.webmanifest`, `scripts/`, `docs/deploy.md` | `release-engineer` |
| `docs/backlog.md`, `docs/decisions.md`, `docs/work-orders/` | main session (PM role) |

Commit rule, from CLAUDE.md §4b and the 2026-09-10 incident: **`git add <named paths>` only. Never
`-A`.** Commit after every single serial item — an uncommitted half-edit is the one thing that turns
a failed agent run into lost work.

---

## 2b. AMENDMENT — the deploy is TEN files, not six

**Added 2026-09-11 by the main session, after `release-engineer` closed B-68 in `2010cf0`.**

This file was written before the PWA icons existed and says "six files" throughout. That count is
now wrong and acting on it would reopen the exact defect B-68 closed: `manifest.webmanifest` names
three PNGs and `sw.js` precaches a fourth, so leaving them out of a deployment 404s the manifest
and degrades the install.

A Vercel deployment is a complete immutable snapshot, not a patch — a file omitted from the upload
does not keep its old version, it ceases to exist at that deployment. That is why the count matters.

The ten:

| # | File |
|---|---|
| 1 | `index.html` |
| 2 | `logic.js` |
| 3 | `tests.html` |
| 4 | `assets/archivo-inline.css` |
| 5 | `manifest.webmanifest` |
| 6 | `sw.js` |
| 7 | `assets/icon-192.png` |
| 8 | `assets/icon-512.png` |
| 9 | `assets/icon-maskable-512.png` |
| 10 | `assets/apple-touch-icon-180.png` |

`docs/deploy.md` and `scripts/verify-deploy.sh` are **authoritative** at ten and already agree.
Where this file says six — §0c, §6.1, §7.1, §7.2(7) — read ten.

**Also corrected:** §4.6 and the epic text give the theme colour as `#14100E`. That value appears
nowhere in this codebase. The repo's token is `--bg: #1c1b1a` (`index.html:18`) and that is what
shipped in the manifest and the icons. `#14100E` is stale text, not a spec.

---

## 3. The dispatch list

Nine waves. Waves marked **RESERVED** are never cut; cut inward from Wave 5.

---

### WAVE 0 — now, while the figures agent holds `index.html`

All three are on separate files. Dispatch as one batch.

**0a · `backend-engineer` → B-65 · Resolve `d3d`'s name**
Files: `logic.js` only. **Does not touch `tests.html`.**
> In `PHAT_PLAN`, slot `d3d` reads `n: "DB row or shrug"`. The app cannot ship a slash-name: two
> exercises in one history is the same defect Rule A1 resolved for `d2e`. Change `n` to `"DB row"`.
> Change nothing else — `implement:"db"`, `lift:"l_dbrow"`, `k:"hyp"`, `cut:1`, `s/lo/hi` and the
> existing cue are all correct for a DB row and were already written for it. Add a comment above the
> slot recording that this is a **reversible default chosen in Chady's absence**, that reverting to a
> shrug costs exactly two strings (`n` and the cue `"Keep the arms straight, no rolling the
> shoulders."`), and that no other field moves. Report the exact before/after strings to the main
> session so QA can re-pin them; do not edit any test yourself.

**0b · `qa-engineer` → T1 · Fold in the W6 and W7 regression tests**
Files: `tests.html` only.
> `wo-004-redesign` @ `b4f031c` has W6 (shell, a11y floor) and W7 (session screen) landed but not
> covered. Write the regression tests WO-004 W16 names for what is *built*: C-11 (the verdict gate is
> `completedSets >= ex.s` against the prescription), C-12 (remove-set confirmation and undo, asserted
> against `phat:v1:draft` on disk), C-15 (the note field survives a reload), the 44 px floor and the
> contrast floor. Re-run the whole suite and report the true `N / N / 0`. **Two things you must not
> do:** do not change a test to match the code without writing the justification into
> `docs/decisions.md`, and do not retire a manual-checklist item without citing what was observed.
> `backend-engineer` is renaming `d3d` from `"DB row or shrug"` to `"DB row"` in `logic.js` during
> your run — grep for the old literal and pin the new one.

**0c · `release-engineer` → R1 · Make the manual deploy mechanical**
Files: `docs/deploy.md` (new), `scripts/verify-deploy.sh` (new), `sw.js`. **Not `index.html`.**
> The Vercel GitHub App is still not installed, so tonight's release is a manual API deploy — and it
> now covers **six** files, not three: `index.html`, `logic.js`, `tests.html`,
> `assets/archivo-inline.css`, `manifest.webmanifest`, `sw.js`. A partial upload is a black screen.
> Write `docs/deploy.md` with the exact procedure and write `scripts/verify-deploy.sh` — a curl-only
> check that fetches all six from the live origin and fails loudly unless each returns **200**, the
> right `content-type`, and a byte length matching the local file. No build status, no dashboard
> screenshot: fetch the bytes. Also re-check `sw.js`'s `CORE`/precache list against the real file set
> and against B-68 (the manifest names icons that do not exist) — do not add icon entries that 404,
> because `sw.js` already refuses to cache a failure and a 404 in the precache list is a failed
> install. **Do not bump the sw `VERSION` yet** and do not deploy anything; both happen in Wave 7.

---

### WAVE 1 — the serial chain opens. **Gate already met.**

> **Update while this plan was being written:** the figures agent committed at **`615c4e5`** —
> *"WO-004: rebuild the 15 movement figures, and close B-64"*. `git status` shows `index.html`
> clean. **Wave 1 can be dispatched immediately, in parallel with Wave 0**, which touches no
> shared file. Do not wait.

**1a · `frontend-engineer` → B-66 + B-67 + B-27 · One programme, one source, and the typeface**
Files: `index.html` only. **SERIAL.**
> Three small changes in one pass, because they all touch the top of the file.
> 1. **B-66.** Delete the `PROGRAM` array at `index.html:508` and the `KEY_LIFTS` array at `:557`.
>    Every screen reads `PHAT.PHAT_PLAN` — the days, the exercise list, `n`, `s`, `lo`, `hi`, `k`,
>    `implement`, `cut`, `lift`, `cue`, `wd`. If a shim named `PROGRAM` is the cheapest way to avoid
>    rewriting 40 call sites, it is a **derived read** of `PHAT.PHAT_PLAN` with a comment saying so —
>    never a second copy of the data. `KEY_LIFTS` labels become `Row`, `DB press`, `Squat`, `SLDL`
>    (B-27: the current `Bench` and `Deadlift` are lies — they are a flat DB press and a stiff-leg
>    deadlift).
> 2. **B-67.** Add `<link rel="stylesheet" href="assets/archivo-inline.css">` to `<head>` so the
>    inlined face actually loads. It must work from `file://` and with no network. Then **re-run W6's
>    measurement pass** — every 44 px and 200 %-zoom figure in the repo was measured on the fallback
>    stack and Archivo has different metrics. Report any control that drops below 44 px on **width**.
> 3. If the session screen has a cue slot that was rendering empty, it now has data — 43 cues exist
>    in the plan document. Render them; do not write new cue text.
>
> Acceptance: `grep -n "Glute-ham\|DB row or shrug\|or lying leg curl" index.html` returns nothing.
> `grep -c "n:\"Squat\"" index.html` finds no second programme. The app boots from `file://` with no
> console error. **Data criterion: `phat:v1:log`, `phat:v1:bw` and `phat:v1:draft` are byte-identical
> before and after loading the changed shell** — this item changes no storage path.

Parallel in Wave 1: `qa-engineer` continues T1; `release-engineer` continues R1.

---

### WAVE 2 — gate: 1a committed, tree clean.

**2a · `frontend-engineer` → WO-004 W11 · The Weight tab**
Files: `index.html` only. **SERIAL.**
> Build WO-004 W11 to `docs/specs/wo-004-screens.md`. This is not cosmetic: the shipped `vWeight`
> still carries **B-06** — it averages the last 7 *entries* rather than 7 *days*, and its calorie
> bands contradict the handoff brief. Replace it wholesale with `PHAT.calorieAdvice` and
> `PHAT.bwWindows`, rendered verbatim including the trailing `Recheck in 7 days.` No sentence is
> assembled in the view. The average carries its day count: `7-day average (6 of 7 days)`. 8 entries
> over 24 days shows **no** rate and **no** advice. The kg/week number is not coloured by whether it
> is good. **Data criterion: logging bodyweight twice on the same local calendar date updates one row
> and never creates two** — verify at 23:59 and 00:01 with the machine clock in a non-UTC zone.

Parallel in Wave 2: `backend-engineer` → **2b, optional**, the pure demo-store generator
(`PHAT.demoStore(seed)`) in `logic.js` for W13b, six weeks of plausible sessions, every one carrying
`demo:true`. Gravy; build it only if backend is otherwise idle.

---

### WAVE 3 — gate: 2a committed, tree clean.

**3a · `frontend-engineer` → WO-004 W9 + W13a · Home, onboarding and Settings, in one pass**
Files: `index.html` only. **SERIAL.**
> These are one item tonight and must not be split, because W9 **deletes** the Full-volume checkbox
> and the Export button from the Train tab, and W13's Settings screen is where Export lands. Split
> them and there is a window with no way to export.
> - **W9:** the next-session block with `START SESSION`, the day list with weekday labels from the
>   plan document's `wd` (B-31), exactly **one** programme-state line from `PHAT.cycleLine` (C-10 —
>   the week-6 countdown does not appear beside it), the D1 deload banner, and first-run onboarding.
>   Delete the Full-volume checkbox (C-1, B-23): the tier's status lives on the cycle line and the
>   offer lives on the session screen. Add the top-right `SETTINGS` button (the one top-corner
>   control the UX spec permits, §0.4).
> - **W13a:** the Settings screen per `wo-004-screens.md` §10.2–10.5 — rest timer `AUTO-START` /
>   `MANUAL`, Export with **both** its success and failure states visible, and the honest storage
>   line: `Your log lives on this device. Export writes a copy you can keep. This version cannot read
>   one back in yet.` No Volume section, no weight-increment section, no `SWITCH TO AN EMPTY LOG`.
> - Ride along two cheap P3s while you are in the boot path: **B-40** (the draft notice currently
>   overwrites the more serious store notice — the worst fact wins) and **B-39** (a full disk freezes
>   the draft silently; route the notice through the existing `#bs-live` region, which is outside
>   `#view` and so violates neither B-19 nor the no-autosave-indicator rule).
> - **Scope out:** the demo sandbox (W13b). Leave no dead control for it.
>
> Data criteria: `START SESSION` on a day that already has an unsaved draft **offers** that draft and
> does not overwrite it, verified against `phat:v1:draft` on disk. Onboarding appears only when both
> stores are **genuinely absent**, never when a read failed; with storage blocked the storage notice
> wins. Before training week 6 the word "deload" appears nowhere in the rendered DOM at
> `trainingWeeks` 0–5.

---

### WAVE 4 — first cuttable wave. Gate: 3a committed, tree clean.

**4a · `frontend-engineer` → WO-004 W10 · Trend**
Files: `index.html` only. **SERIAL.**
> `vTrend` currently recomputes stall detection inline — that inline block **is B-07**, the bug where
> week 1 `100×3/3/3` → week 6 `100×5/5/5` reports no progress. Delete it and render
> `PHAT.stallReport`'s output verbatim. Sparklines group by `lift`, not by name. Deltas carry a sign
> as well as a colour. Labels read `DB press` and `SLDL`. The empty state names why it is empty and
> what unlocks it. **Data criterion: this screen is read-only — no storage key changes across a full
> render at every data volume from 0 to 200 sessions.**

---

### WAVE 5 — second cuttable wave.

**5a · `frontend-engineer` → WO-004 W8 · Summary and the save path.** `index.html`. SERIAL.
**5b · `frontend-engineer` → WO-004 W12 · Diet.** `index.html`. SERIAL. Copy verbatim from W1's
signed-off numbers; a test must assert no engine reads the protein checkbox.

Cut 5b before 5a. Cut both before touching Wave 6.

---

### WAVE 6 — **RESERVED. Always runs, even if 4 and 5 are cut entirely.**

**6a · `release-engineer` → E-4 wiring · The PWA goes live, and it goes last**
Files: `index.html` (the `<head>` and one registration block), `sw.js`. **SERIAL — must be the final
`index.html` edit of the night.**
> Add `<link rel="manifest" href="manifest.webmanifest">` and the service-worker registration to
> `index.html`, and bump `sw.js`'s `VERSION`. **This is deliberately last**, because a service worker
> that caches a half-finished shell is the worst failure available tonight: it persists on his phone
> and survives a reload. Register only after `load`; never call `location.reload()` on an update —
> the atomic-refresh ruling in `decisions.md` (2026-09-10) stands. Registration must be wrapped so
> that a failure to register cannot stop the app rendering, and the whole thing must be a no-op on
> `file://`. Verify: with the sw installed and the network off, a cold reload of the live origin
> renders the app, serves `/logic.js` from cache with a JavaScript content-type, and a set can be
> logged and saved.

---

### WAVE 7 — **RESERVED.**

**7a · `qa-engineer` → WO-004 W16 · The full pass, scoped to what shipped**
Files: `tests.html`, and `docs/decisions.md` for any justification.
> Walk every WO-004 acceptance criterion for the items that actually landed tonight, at a true 400 px
> with the network off and at 200 % text. Mark each **pass or fail with the observed behaviour**, not
> a summary. Then attack it: the destructive controls, the draft across reload and force-kill,
> storage full, storage blocked, a malformed `7.5.0`, a `0 × 10` rack chin. Report the final
> `N / N / 0`. **A skipped or deferred WO-004 item is reported as "not built", never as "pass".**
> The suite must be green with zero expected failures and both meta-tests in force. If it is not,
> that is a stop condition — see §6.

**7b · `release-engineer` → WO-004 W17 · Merge and deploy, once.** Only after 7a is green.
> Merge `wo-004-redesign` into `main`. Deploy **all six files** in one manual API deploy using
> `docs/deploy.md`. Then run `scripts/verify-deploy.sh` and paste its output. If any file fails its
> check, **roll back to the previous deployment immediately** — a half-uploaded shell is a black
> screen on his phone and is worse than yesterday's build. Deploy exactly once tonight; do not deploy
> per wave.

---

### WAVE 8 — **RESERVED.** Main session, PM role.

Update `docs/backlog.md` (B-65, B-66, B-67, B-68 filed; W-item statuses moved), write the night's real
decisions to `docs/decisions.md`, and write the wake-up note (§7).

---

## 4. The five blocked items — the default I am shipping for each

### 4.1 Vercel GitHub App not installed → **work around it, mechanically**

Cannot be done without his GitHub account. **Default: keep the manual API deploy, but stop trusting a
human to remember six filenames.** Wave 0c turns the procedure into `docs/deploy.md` plus a curl
verifier that fails on content-type or byte length. E-2 stays open and becomes the first line of the
wake-up note — it is a two-minute click for him and it removes the single most repeated risk in this
project's history.

### 4.2 The compromised Vercel token → **use it once, tonight, then rotate**

Say the uncomfortable part plainly: the token was pasted into a chat and its exposure is already
total. **Using it again does not increase the compromise** — it is either already known to a third
party or it is not, and one more deploy changes neither. Declining to deploy costs a working app at
wake-up and buys nothing.

**Default: one deploy, in Wave 7b, after QA is green.** Not per wave — fewer uses, smaller window,
and the only deploy is of a verified tree. Before the deploy, `release-engineer` greps the six files
for any credential string; nothing but the eventual Supabase *anon* key may ever be in them, and there
is no Supabase key yet. Rotation is the first action item in the wake-up note, and until it happens
`main` is the recovery path: a bad third-party deploy is undone by redeploying `main`.

### 4.3 `d2e` and `d3d` → **defaults chosen, both reversible, cost stated**

**`d2e` — already resolved, and the only work left is to stop contradicting it.** The plan document
says `Lying leg curl`, `implement: "machine"`. `index.html`'s duplicate `PROGRAM` still says
`Glute-ham raise or lying leg curl`, `implement: "bodyweight"` — B-66. Deleting the duplicate resolves
it; no new decision is made tonight.

**The revert cost for `d2e` is not one string, and it grows.** Switching to a glute-ham raise changes
`n`, changes the cue to `"Keep the body in one line from knee to shoulder."`, **and flips `implement`
back to `bodyweight`** — which changes Rule Z2's load word from a kg figure to `bodyweight` and
switches Rule I2's increment line **off**. Free today, because `d2e` has zero logged entries. The
first time he logs it, every historic entry re-renders with a different load word. **This is the one
question worth answering before his next Lower Power session**, and it goes in the wake-up note with
exactly that framing.

**`d3d` — defaulting to `DB row`.** Reasons, in order: the app cannot ship a slash-name (two exercises
in one history is the defect Rule A1 already struck down for `d2e`); the design chose DB row; the
signed-off cue was written for the DB row; and unlike `d2e`, **nothing else on the slot moves** —
`implement:"db"`, `lift:"l_dbrow"`, `k:"hyp"`, `cut:1`, `s:2`, `12–15` are all correct for either.

**Revert cost for `d3d`: two strings.** `n` → `"DB row or shrug"`… no — `n` → `"Shrug"`, and the cue →
`"Keep the arms straight, no rolling the shoulders."` (already written by the coach as the revert
lookup). Zero data impact while the log is empty. After logging, the id is opaque so the history
stays attached regardless; the only cost is that past entries re-render under the new name, and sets
logged as a row would read as shrugs. That cost argues for him answering it soon, not for leaving a
slash-name on screen tonight.

### 4.4 No Supabase URL or anon key → **build nothing, and add no affordance**

E-3 cannot start and **must not be stubbed**. No `supabase.js` import, no placeholder keys, no
"Sync" button that does nothing, no "offline — will sync later" copy. A sync affordance that does not
sync is a false durability promise, which is the same class of error as the export line W13a is
fixing. In the meantime the app's honest statement of its own durability is exactly the line shipping
in Settings: *"Your log lives on this device. Export writes a copy you can keep. This version cannot
read one back in yet."* E-3 stays blocked on his project URL and anon key.

### 4.5 The phone checklist → **cannot be run; grow it, do not fake it**

Nothing here can answer it and no item is retired by assertion. **Default: leave the 4 existing items
open, add the ones tonight creates, and hand him one ordered card he can run in five minutes.** Each
item names the exact expected observation:

1. Pinch-zoom works on the session screen (`maximum-scale=1` removal, B-13).
2. The fixed `#dock` with the software keyboard up on the session view — no input covered (B-36).
3. Archivo renders on iOS Safari from the inlined face, offline (B-67 — new tonight).
4. Add to Home Screen works and the installed app opens offline in airplane mode (E-4 — new tonight).
5. An update lands without a reload interrupting a set: install, deploy, reopen (new tonight).
6. The ghost hint is fully visible on every set row at his real device width (B-37).
7. A set logged in airplane mode survives a phone lock and a browser kill.
8. `/tests.html` from the phone reads `N / N / 0`.

### 4.6 (Found tonight) B-68 — missing PWA icons → **generate a placeholder pair, reversibly**

An install with missing icons is a degraded install, and a 404 in the precache list is a **failed**
service-worker install, which is worse. **Default: `release-engineer` generates a 192 px and a 512 px
PNG from the app's own tokens** — flat `#1c1b1a` with an amber `#f5b32b` bar — with Node's built-in
`zlib` and no dependency, or drops the icon entries from the manifest entirely if that cannot be done
cleanly. Whichever is chosen, the manifest and the precache list must agree with the files that exist.
His artwork replaces two files later; nothing else changes.

---

## 5. The cut line

**Restating WO-004's ruling for tonight, unchanged: M3 (W14 Plans list, W15 Plan Editor) is cut
outright.** It is new capability, it is the largest remaining item, and the design's own honest note
says it best: *"Editing the plan is the easiest thing in this app to do instead of training."* The
Plan tab stays a named placeholder. That is not a failure state — W6 shipped it that way deliberately.

### The floor — what "fully developed and operational" honestly means at wake-up

> He opens the live URL on his phone, in airplane mode, and logs a complete Upper Power session —
> correct exercise names, the signed-off cues, correct verdicts — saves it, reloads, and it is still
> there.

That requires, and only requires:

| # | Item | Why it is in the floor |
|---|---|---|
| 1 | Figures (B-60 / B-64, running) | Already in flight; blocks the file |
| 2 | **B-66 + B-67 + B-27** (Wave 1) | Wrong exercise name and wrong load word **on screen today**; 43 cues unreachable; the typeface never loads |
| 3 | **W11 Weight** (Wave 2) | B-06 is live wrong advice and fires within 7 days of him weighing daily |
| 4 | **W9 + W13a** (Wave 3) | The Full-volume checkbox misrepresents the programme (C-1); Home is the first screen; Export needs a home |
| 5 | **E-4 wiring** (Wave 6) | The gym has no signal. Without a service worker the live URL does not load there at all. This is the difference between an app and a bookmark |
| 6 | **QA green + one verified six-file deploy** (Wave 7) | Nothing above counts if the deploy half-fails |

### Gravy, in the order it gets added back

1. **W10 Trend** — it contains a live wrong-advice bug (B-07 in the inline stall block), but that bug
   **cannot fire for six weeks** on an empty log. That is the honest reason it sits above the cut and
   W11 does not.
2. **W8 Summary** — a review step before save. Saving works without it via `finish()`.
3. **W12 Diet** — static, cheap, closes B-29, removes a visible "Not built yet".
4. **W13b demo sandbox** — genuinely optional; it exists to make Trend look populated.
5. **B-68 icons** — cosmetic on install.

### Cut outright tonight

W14, W15 (M3). B-04/B-16 (the import round trip — that is WO-002). E-3 Supabase. B-05 (edit a saved
session). B-11 (date-spaced chart).

---

## 6. "Operational" — the checklist to run before he wakes

Not aspirations. Each line is a command or an observation with a pass condition. If any line fails,
it is reported as failed in the wake-up note; nothing here is marked pass by inference.

### 6.1 The deployed URL

- [ ] `GET /` → **200**, `text/html`, body contains the dock markup and **does not** contain
      `maximum-scale`.
- [ ] `GET /logic.js` → **200**, content-type contains `javascript`, byte length equals the local
      file, body contains `PHAT_PLAN`. (A 404 body served as HTML is the historical failure.)
- [ ] `GET /assets/archivo-inline.css` → **200**, `text/css`, ~47 KB.
- [ ] `GET /manifest.webmanifest` → **200**, JSON-ish content-type, and **every** icon it names
      returns 200.
- [ ] `GET /sw.js` → **200**, `javascript`, and its `VERSION` string equals the one committed.
- [ ] `GET /tests.html` → **200** and runnable from a phone browser.
- [ ] The deployed commit matches `main`'s HEAD SHA.
- [ ] `main` and `wo-004-redesign` are merged; `git status` clean; nothing uncommitted.

### 6.2 The test suite

- [ ] `tests.html` opened from `file://` reads **`N / N / 0`** — zero failures, zero unexplained
      skips. Record `N` in `docs/backlog.md`'s tripwire line and in the merge commit message.
- [ ] Both meta-tests are present and passing (they fail on any `known bad` / `xfail` name and on any
      skip without a stated reason).
- [ ] Every test changed tonight has a one-line justification in `docs/decisions.md`. A test changed
      to match the code with no justification is a failure of this checklist, not a pass.

### 6.3 The data paths — run these in a browser, do not reason about them

- [ ] **Draft survives.** Start a day, enter three sets across two exercises, type a note, reload:
      all three sets, both exercises, the note **and the current exercise index** come back.
      Declining discards the draft and leaves `phat:v1:log` byte-identical.
- [ ] **Force-kill.** Repeat with the tab killed rather than reloaded. Same result.
- [ ] **Malformed input refuses.** Type `7.5.0`: save is refused, the offending set is **named**,
      nothing is written, the draft is untouched.
- [ ] **Zero-weight survives.** `0 × 10` on a rack chin saves as `w:0`, reads back as
      `Stay at bodyweight until all 2 sets reach 10 reps.`, and the string `0 kg` appears nowhere in
      the rendered DOM of any screen.
- [ ] **Remove-set cannot eat a number.** `120 × 5` in set 3 of 3 → `− REMOVE` confirms, names the
      numbers, cancel leaves it, confirm+undo restores it byte-identically in `phat:v1:draft`.
- [ ] **Save commits once.** A saved session appears in the log with every set including extras and
      the note byte-identical; the draft clears **only after** the log write is confirmed.
- [ ] **Local dates.** Log bodyweight twice on one local calendar date → one row, verified at 23:59
      and 00:01 with the clock in a non-UTC zone.
- [ ] **Migration is safe.** Seed a v3 store with sessions across all five days, migrate: every
      `dayId`, every entry key, every `w` and `r` byte-identical; run the migration three times, the
      store is byte-identical after each. **No schema version is bumped tonight** (§6.5).
- [ ] **Read-only screens are read-only.** Visit Trend, Weight, Diet, Settings and Plan: all three
      storage keys byte-identical before and after.

### 6.4 Offline

- [ ] Load the live URL once with the network on, then switch to airplane mode / DevTools offline and
      **cold-reload**: the app renders, the day list is there, a set can be entered and **saved**, and
      it is still there after a second offline reload.
- [ ] `file://index.html` opens with no network and no console error — this remains the honest test
      path (`decisions.md`, 2026-09-10).
- [ ] The service worker's update path does not reload the page under him.

### 6.5 The freeze list — things that must be true because nobody changed them

- [ ] The schema version is **unchanged** from `b4f031c`. No migration was written tonight.
- [ ] No new user-facing sentence that makes a **training claim** shipped without `strength-coach`.
      Status, navigation and refusal copy are exempt; anything about load, reps, rest, deloads,
      calories or bodyweight is not.
- [ ] No control anywhere empties the real log without a typed confirmation.
- [ ] No credential string appears in any of the six deployed files.

---

## 7. Risks specific to running unattended, and the stop conditions

### 7.1 The risks

| Risk | Why it is worse at 3 a.m. | Mitigation |
|---|---|---|
| **Two agents on `index.html`** | Nobody notices the overwrite until the diff is unreadable | One holder at a time; `git status --short` clean before each dispatch |
| **`git add -A` sweeps a half-written file** | It already happened on 2026-09-10 and cost a mis-attributed 830-line commit | Named paths only, every time, no exceptions |
| **A failed agent run leaves uncommitted work** | No one is awake to notice the tree is dirty | Commit after **every** serial item |
| **A service worker caches a broken shell** | **The single worst outcome available tonight.** It persists on his phone, survives a reload, and he cannot log a set in the gym | Wire the PWA **last**, after the final `index.html` edit; bump `VERSION`; verify offline before deploying |
| **A partial six-file upload** | Black screen, and the historical failure mode of this project | One deploy, after QA, verified by fetching bytes, rolled back on any failure |
| **A green suite over wrong behaviour** | `decisions.md` already records "a suite can go green on data the screen never reads". An agent alone with a red test will make it green | No engineer touches `tests.html`; QA owns it; every changed test needs a written justification |
| **An agent invents coaching copy** | The code can be perfect and the advice wrong, and QA cannot detect that | Any new sentence making a training claim → stop, leave the slot empty with a `TODO [COACH]` marker, report it. Never ship a guess |
| **Scope drift in an unsupervised frontend run** | A "while I'm in here" refactor of `render()` (B-19) at 4 a.m. is unreviewable | Each brief says what is out of scope. B-19 is out of scope tonight, in all waves |
| **Measurements invalidated by Archivo** | Every 44 px / 200 % figure was taken on the fallback stack | B-67 lands in Wave 1 so the night measures once, against the real face |

### 7.2 Stop conditions — halt the chain, commit what is safe, write a note, do not push on

1. **Any reproducible data-loss path** in the draft, the log or the bodyweight store. This is the only
   P0 class. Stop immediately, do not deploy, leave the branch unmerged.
2. **The app does not boot from `file://`** — a black screen or a console error at load. Revert to the
   last good commit before continuing; never deploy a tree in this state.
3. **The suite is not `N / N / 0`** at Wave 7a, or `N` has *dropped* without a per-test written
   justification. Do not merge. Deploy nothing.
4. **An agent proposes a schema bump, a migration, or any rewrite of a stored value.** Tonight is not
   the night; the cost of getting it wrong is unrecoverable and the benefit waits until morning.
5. **A training claim needs adjudication** and `strength-coach` cannot answer decisively from the
   brief, `coach-audit.md` or `coach-audit-addendum.md`. Leave the slot empty and marked; do not
   substitute a plausible sentence.
6. **Two agents are found to have edited `index.html` in the same window.** Stop, diff, reconcile by
   hand, re-run the affected item from the last clean commit.
7. **`scripts/verify-deploy.sh` fails on any of the six files.** Roll back to the previous deployment
   at once. A working yesterday beats a half-uploaded today.
8. **Any credential appears in a file staged for deploy.** Stop, remove, do not deploy, note it.

In every case the deliverable becomes the note, not the code: what stopped, where the tree is, what
the last known-good commit is, and what the app currently does for him in the gym this morning.

---

## 8. Needs from Chady — the wake-up note, in priority order

1. **Rotate the Vercel token.** It was pasted in chat. It was used once more overnight for the
   release; rotate it before anything else.
2. **Install the Vercel GitHub App** on `chadyantoun-ux/Gym-App` (E-2). Two minutes, and it ends the
   manual six-file deploy that is this project's most repeated risk.
3. **`d3d`: DB row or shrug?** Defaulted to **DB row**. Reverting costs two strings and nothing else.
4. **`d2e`: lying leg curl or glute-ham raise?** Defaulted to **lying leg curl** (`implement:
   machine`). Reverting costs three things — the name, the cue, and `implement` → `bodyweight`, which
   changes Rule Z2's load word and switches Rule I2's increment line off. **Free today. Not free after
   the first logged Lower Power session.** Answer this one before you train legs.
5. **Run the 8-item phone checklist** (§4.5). Five minutes. Nothing in this repo can answer it.
6. **Supabase project URL + anon key** when you want E-3. Nothing was stubbed in the meantime.
7. **The PWA icons** if you still want to draw them; placeholders shipped and are two files to replace.

And the standing one, which is the only item on this list that changes the outcome of the project:

> **Log Upper Power today.** The app is not the bottleneck and has not been for four builds.
