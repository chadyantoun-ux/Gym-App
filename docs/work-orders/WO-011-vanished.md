# WO-011 — The session that vanished from the phone, and pull-and-merge on every open

**Filed:** 2026-09-13, morning. **Severity:** P0 (data loss on the device — the only P0 class).
**Status:** open. **Stop condition: no deploy of `index.html` / `logic.js` / `sync.js` / `sw.js` until the
cause of the loss is known** (§4). Chady is waiting; this order is written to be executed in hours, not days.

## Ask

Chady, verbatim, this morning: *"I can't see it, did you publish"* · *"and you lost the data from my
session yesterday"* · *"why isn't pushed to the database I don't get it"* · *"dude what is this design
ridiculous"*. Then, ruling on the sync behaviour: *"it needs to pull from the db"* / *"otherwise how can I
track"*.

## Reading of it

Two problems, in severity order, plus one ruling.

1. **His 12 Sep session is not on the phone he is holding.** It *is* on the server: session
   `1789264514484` (12 Sep, `d1`, six entries), `deleted_at null`, `client_updated_at 2026-09-13 01:55:19 UTC`.
   Production has been `main @ 11c44ff` since ~22:40 UTC on 12 Sep, 59 files byte-verified. A push at
   01:55 UTC means: **some context on his phone loaded the WO-010 build, read the session, migrated it to
   schema 6 (`m.logChanged` → `save(LOG)` → `backupSoon`), and pushed it.** The local copy disappeared, or
   became invisible to him, after that.
2. **The app does nothing useful when the server has sessions the phone lacks.** E-3 ruled "push-only,
   never pull automatically". Chady has now overruled that entirely (see §2): the app pulls on every open
   and merges.
3. *"Can't see it"* is ambiguous: (i) can't see the new build, or (ii) can't see the session. *"What is
   this design ridiculous"* says he **is** seeing a build with a design he did not expect — which is the
   WO-009 photographs + WO-010 load chips, i.e. the new build. **[Likely]** reading (ii): he sees the new
   build and not his session. The diagnostic step below distinguishes the two without assuming either.
   The design complaint is **out of scope** here; it is filed as B-120 for a UX pass after this P0 closes.

**Nothing is written to the server by this order until §1 is answered.** The server row is the one copy
we are sure of; the first rule of this morning is that no agent touches it.

## Constraint & backlog check

- CLAUDE.md §3.3 (never lose a number) is the whole order. §3.2 (offline-first): the pull is best-effort
  on top of local storage, never a precondition — a pull that fails or is offline changes nothing.
- **E-3 (decisions.md 2026-09-11) is superseded by Chady's ruling.** Recorded in `docs/decisions.md`
  today. The E-3 guarantee that mattered — *a pull never shrinks or rewrites a local log* — is kept as a
  data criterion of the merge, not as a ban on pulling.
- B-76 (an empty log pushed over a real backup) stays true and is unaffected: a push never deletes on the
  server, and the "open" push is still gated on `onboarded`.
- B-88 (device owner stamp, WO-008 W4) applies to the merge exactly as it applies to a push: an account
  that does not own a non-empty device's log gets the owner refusal and nothing is merged.
- B-116 (warm-up sets) and B-111/B-117 are untouched. No engine, `verdictFor`, `PROGRAM` or advice path is
  in scope — **no `strength-coach` item.**
- `tests.html` is 802 / 802 / 0 on `main @ 11c44ff`; W5 adds to it and the tripwire moves.

## 1. Diagnosis first — what he answers, what the phone reveals

The facts fit several causes. **Do not guess. Collect the observations below; each row names what
confirms or rules out a hypothesis.** Hypotheses, ranked by prior:

| # | Hypothesis | Fits the 01:55 push? | What confirms it | What rules it out |
|---|---|---|---|---|
| H1 | **Two storage contexts.** iOS gives a Safari tab and a home-screen web app **separate** localStorage and separate SW caches. He logged in context X; he is now opening context Y. X still holds the session (and pushed it at 01:55 after loading the new build); Y has an empty/absent log and — if it had never loaded since the deploy — possibly a stale shell. Both symptoms fit **because they come from different contexts.** | Yes: X pushed. | Opening the *other* launcher shows the session in History. | Both launchers show no session. |
| H1′ | **Reinstall wiped the context.** He deleted and re-added the home-screen icon (a common move when "I can't see the new version") or cleared Safari website data. iOS deletes a home-screen web app's storage with the icon. The 01:55 push came from the old install before deletion, or from Safari. | Yes. | He says yes to Q3. Diag (W1) shows `log: absent`, no `recover:*`, no backup stamp, `onboarded` false, or an onboarding screen was shown this morning. | He says no to Q3 and the stamp and `onboarded` are present. |
| H2 | **Boot preserved an unreadable store.** `readRaw(LOG)` returned `error` on his real store; `preserveUnreadable` kept it at `phat:v1:recover:log:<ts>` and the app booted with an empty log and the notice *"Your saved log could not be read. A copy has been kept aside…"*. | Only if a boot **after** 01:55 failed on a store the 01:55 boot read fine — possible if the schema-6 write itself produced bytes this build cannot parse (a `save()` that half-landed on a quota error). | A `recover:log:*` key exists (W1); the notice is on screen. | No `recover:*` key and no notice. |
| H3 | **Render crash after adoption.** The log is on disk; a view (Home/History with WO-010 `ld` sets or WO-009 photos) throws and the screen stays blank or on "Loading." — *"can't see it"* literally. Data is not lost. | Yes. | Diag (W1) shows `log: ok`, session count 1, while the app shows nothing. | Diag shows the log absent. |
| H4 | **Half-shell from `sw.js`.** Ruled out on the code: `sw.js` v5 commits a refreshed shell **both or neither** (atomic-refresh ruling, 2026-09-10), never `skipWaiting`, no `reload`. A half-shell would produce the black-screen mode, not an empty log. **Keep only if W1 shows two cache names or a `logic.js` that does not match `index.html`'s expectation.** | — | Two `phat-shell-*` caches, or `/logic.js` from the phone's cache differing from production. | One cache, `phat-shell-v5`. |
| H5 | **Restore / REPLACE replaced his log.** Ruled out unless he typed `REPLACE`: restore keeps `recover:log:*` first and refuses if the keep fails; from an empty account it would still keep. It would also not *add* rows on the server. | — | `recover:log:*` key **and** he remembers typing REPLACE. | No `recover:*` key. |
| H6 | **iOS storage eviction.** ITP's 7-day script-storage cap applies to Safari tabs with no interaction, not to one day and not to installed web apps. **Ruled out** on timing unless Q3 reveals a data clear. | — | — | — |
| H7 | **A foreign account.** Diana's account signed in on his phone: push and restore are *refused* by B-88 and nothing is written. Cannot delete. **Ruled out as a deletion cause**; it can only explain *"why isn't pushed"* if the identity line names her. | — | Identity line shows her email. | Shows his. |

The code has **no path that removes `phat:v1:log`**: `del()` is called on the draft only; the only
control that shrinks the log is `restoreApply` behind typed `REPLACE` with a keep first. So a *deletion by
the app* is the least likely cause; a *different context* or a *wiped context* is the most likely.
**[Likely] H1 or H1′.** Not certain, and certainty is the point of W0/W1.

### W0 · Four questions and two taps — owner: **main session** (asks Chady), no agent

Ask, in this order, and record the answers on backlog row B-119:

- **Q1.** How are you opening it — the icon on the home screen, or a Safari tab? Open it **the other way**
  as well: does History show the 12 Sep session in either? (Discriminates H1.)
- **Q2.** In each, Settings → the Backup line: does it say *"Signed in as <email>. Backs up after every
  saved session and weight."* and which email? Is there a *"Your saved log could not be read…"* notice
  anywhere on Home? (Discriminates H2, H7, and which context has been used.)
- **Q3.** Last night or this morning, did you delete the icon and add it again, or clear Safari's
  website data, or reinstall anything? (Discriminates H1′.)
- **Q4.** When you say "can't see it": the app looks the same as last week, or it looks different and
  you don't like it? (Resolves the ambiguity in "Reading of it".)

**If Q1 finds the session in the other context: the cause is H1, nothing was lost, and W3/W4 (the
merge) is the fix. Skip W1.** If Q3 is "yes": H1′, nothing recoverable locally, the merge restores it;
skip W1. Otherwise W1.

### W1 · `diag.html` — a read-only diagnostics page — owner: **frontend-engineer**, then **release-engineer**

Scope: one new static file, `diag.html`, **no change to `index.html`, `logic.js`, `sync.js` or `sw.js`**,
and **not added to the SW shell list** (it is used with signal; precaching it would change the shell file
list and force a `sw.js` bump under the stop condition). It runs from `file://` and `https://`, vanilla,
one IIFE, `"use strict"`, and **reads only**. It prints, in plain text, in this order:

1. Display mode: `standalone` (home-screen) or `browser` (`matchMedia("(display-mode: standalone)")` and
   `navigator.standalone`). This is the H1 discriminator he cannot see any other way.
2. For each of `phat:v1:log`, `phat:v1:bw`, `phat:v1:plans`, `phat:v1:draft`, `phat:v1:prefs`,
   `phat:v1:planedit`: `absent` / `ok` / `unparseable`, byte length, and for `log`: schema version, session
   count, the ids and dates of every session, and the count of entries per session. For `prefs`: the backup
   stamp (`at`, `n`, `m`, owner email), `onboarded`.
3. Every key beginning `phat:v1:recover:` with its byte length and `savedAt`.
4. Every other `localStorage` key name (name only).
5. Service worker: registration scope, controller state, and `caches.keys()` — every `phat-shell-*` name.
6. Build: the `sw.js` `VERSION` string as fetched over the network, and `/logic.js` status + content-type,
   so a stale shell is visible.
7. A **COPY ALL** button (≥ 44 px) that puts the report on the clipboard so he can paste it into the chat.

Deployment: `release-engineer` uploads **only `diag.html`**, verifies `GET /diag.html` returns 200
`text/html` with the marker string, and re-verifies `/logic.js` and `/index.html` hashes are **unchanged**
from the 11c44ff verification. This is the one exception the stop condition permits: a file the app does
not load cannot alter what the app does.

Acceptance criteria:
- Opening `diag.html` from `file://` with `phat:v1:log` holding 3 sessions prints `log: ok`, `schema 6`,
  `3 sessions` with three ids and dates; after `localStorage.setItem("phat:v1:log","{")` it prints
  `log: unparseable (1 byte)` and does not throw.
- With a key `phat:v1:recover:log:1700000000000` present, it is listed with its length and `savedAt`.
- The page performs **zero writes**: `localStorage.length` and every value are byte-identical before and
  after load and after COPY ALL (QA asserts by snapshotting `localStorage` before/after).
- On the production origin from the home-screen icon it prints `standalone`; from a Safari tab `browser`.
- `scripts/verify-deploy.sh`'s 59-file list is unchanged; `/logic.js` byte hash after the upload equals
  the 11c44ff hash.

Depends on: W0 not settling the cause.

### The stop condition, restated

**No deploy of the four app files until one of H1–H7 is confirmed by an observation, not by inference.**
Auto-merge shipped before the cause is known would *hide a recurring loss*: a phone that drops its log
every night would look healthy every morning. The main session records the confirmed cause on B-119 and
in `docs/decisions.md` before dispatching W4.

## 2. The ruling: pull-and-merge on every open

Chady, verbatim: *"it needs to pull from the db"* / *"otherwise how can I track"*. This overrides E-3's
"never pull automatically" **entirely** — not only for an empty local log. Recorded as his decision,
reaffirmed, in `docs/decisions.md` (2026-09-13).

The rule:

- **When:** on every open, once, after first paint, when the sync module is ready, signed in, and online.
  Also once after a successful sign-in, and once on `online`. Never on `file://`, never signed out, never
  on a demo store (`logMeta.demo === true` or `plansMeta.demo === true`), never while `S.blockWrites[LOG]`
  or `[BWK]` or `[PLANS]` is set, never when the owner rule (`PHAT.storeOwner`) refuses the signed-in
  account for a non-empty device.
- **What:** the account's sessions, bodyweight and plans (`PHAT_SYNC.pull()` as it exists), passed through
  the **same validation and migration a Restore uses** (`restorePayload` + `migrateStore`), then merged into
  the local stores by **`PHAT.mergeStores(local, remote) → {merged, added, kept, refused}`** — a pure
  function in `logic.js`.
- **Union, local wins, nothing removed.** Sessions merge by `id`; bodyweight by local date (the entry's
  date field, which is the server's `local_date`); plans by plan id. A key present only on the server is
  **added**. A key present on both keeps the **local** document byte-for-byte (`kept`). Nothing local is
  ever removed or rewritten by a merge. A server document that fails validation is **refused and named**,
  never merged, and never blocks the rest.
- **Keep first, once per device.** Before the first merge that would *change* a non-empty local store on
  this device, a verbatim copy of `phat:v1:log`, `phat:v1:bw` and `phat:v1:plans` is written to
  `phat:v1:recover:<store>:<ts>` through `save()` (the `restoreSteps` keep path). If a keep fails, no
  merge. The keep is stamped in `prefs` (`prefs.merge = {keptAt}`) so it happens once, not every morning.
- **Then push.** After a merge that added anything, the merged set is pushed (`backupSoon("merge")`), so
  the server and the phone converge. The existing "open" push is sequenced **after** the merge, never
  before, so an offline-logged session is never pushed and then re-pulled into a conflict.
- **Announced.** Every merge that added something says so, once: *"Restored 1 session from your backup."*
  / *"Restored 3 sessions and 2 weights from your backup."* (plural via `plural()`; plans named only when
  any). A merge that added nothing is silent. Failures are silent on Home and named in Settings → Backup
  (`S.sync.last`), like a failed push — a pull that fails is not an event that costs him anything.
- **The draft never syncs.** `phat:v1:draft` is not read, written or considered by the merge. An open
  draft does not block the merge (the Train tab renders from the draft, not the log).
- **Never re-render under a thumb (B-19).** The merge writes the stores and `S.log`/`S.bw`/`S.plans`; it
  calls `render()` only when no sheet is open and no input has focus; otherwise it announces and the next
  navigation paints the merged data.

### W2 · Merge rules and copy — owner: **ux-designer** (short: one page)

Scope: the announcement lines, the Settings → Backup status wording for a merge (success, refused, offline,
owner), the failure enclosure, and the rule for *when* a merge may repaint. Out: anything about the design
complaint (B-120).

Acceptance criteria:
- Copy for: added N sessions / M weights / P plans (all combinations, plurals), nothing added (silent),
  refused documents (`Restored 2 sessions. 1 item could not be restored: <reason>.`), owner refusal (reuse
  `ownerRefusal` with a new kind `"merge"`), offline (silent), busy.
- A written rule, testable by QA, for when the merge repaints: no open sheet, no focused input, not on the
  Train tab mid-session.
- Voice per CLAUDE.md §4: terse, imperative, no exclamation marks.

Depends on: —. Runs in parallel with W3.

### W3 · `PHAT.mergeStores` and the pulled-document path — owner: **backend-engineer**

Scope: in `logic.js`, `mergeStores(local, remote)` where `local = {log, bw, plans}` are the stores as
adopted (post-migration) and `remote` is the validated-and-migrated result of `restorePayload` on the pulled
rows. Returns `{merged: {log, bw, plans}, added: {sessions, bodyweight, plans}, kept: {…}, refused: [...]}`,
with `merged` documents in builder key order and the log sorted the way `migrateStore` sorts. Also:
`mergeSteps(...)` if the keep needs its own list like `restoreSteps`, and the `"merge"` kind in
`ownerRefusal`. Pure: no DOM, no `S`, no `Date.now()` inside the merge (the keep timestamp is an argument).
No change to `sync.js` unless `pull()` needs a column it does not fetch. **No schema bump.** Out: the boot
wiring (W4).

Acceptance criteria (data — each becomes a `tests.html` case in W5):
- **M1** A pull never reduces the local count: for every `local`, `merged.log.sessions.length ≥ local.log.sessions.length`, same for `bw.entries` and `plans.plans`.
- **M2** A pull never changes a session that exists locally: for every id in both, `JSON.stringify(merged)` of that session equals the local one, byte for byte — including when the server copy has more entries, a later `client_updated_at`, or a different `ld`.
- **M3** A session logged offline and pushed later is never overwritten by the pull that precedes the push: local `{id: X, entries: 5}` + remote without X → `merged` has X unchanged, `added.sessions = 0`, and the merged set is what gets pushed.
- **M4** Idempotent: `mergeStores(mergeStores(l, r).merged, r)` equals `mergeStores(l, r).merged` byte for byte, with `added` all zero on the second call.
- **M5** Union: remote `{A, B}`, local `{B, C}` → merged `{A, B, C}` with B the local copy, `added.sessions = 1`, `kept.sessions = 1`.
- **M6** Nothing removed: a session on the server with `deleted_at` set is not in `remote` (the pull filters live rows) and, if it were, it is ignored — the local copy stays.
- **M7** Bodyweight merges by date: local `{d: "2026-09-12", kg: 85.0}` + remote `{d: "2026-09-12", kg: 85.4}` → local wins; remote `{d: "2026-09-11"}` → added.
- **M8** Plans merge by plan id with the same rules; `activePlanId` is never changed by a merge.
- **M9** A refused remote document (fails `restorePayload`'s validator) is in `refused` with its reason sentence, and the rest of the merge proceeds.
- **M10** A remote schema-5 session comes through `migrateStore` before the merge and lands as schema 6; `local` is never re-migrated by the merge.
- **M11** Empty local (`absent` stores) + remote with 1 session → `added.sessions = 1`, `merged.log` carries the schema version and `profile` handling identical to what `restoreApply` would have written (D1 on his real export from WO-010 W7 is the fixture).
- **M12** The demo guard is the caller's, but `mergeStores` given `local.log.demo === true` returns `{refused: ["demo"]}` and an unchanged `merged` — belt and braces.

Depends on: — (the E-3 validators exist). Runs in parallel with W2.

### W4 · Boot wiring — owner: **frontend-engineer**

Scope: in `index.html`, after `Y.ready()` in `loadSync`'s load handler: `mergeOnOpen()` → then
`backupSoon("open")`. The same call after a successful sign-in (before `backupSoon("signin")`) and on
`online`. The keep-once, the owner check (`storeOwner`, reusing `storesOnDisk()` — B-74: read from **disk**,
not `S`), the demo guard, the blocked-writes guard, the announcement, the repaint rule from W2, and
`S.sync.last` for Settings. Writes go through `save()` only. **No `location.reload()`, no `skipWaiting`,
no listener added to the SW block.** Out: `diag.html` (W1), the design complaint (B-120).

Acceptance criteria:
- **F1** Empty device, signed in, server has the 12 Sep session: open → within one pull, History shows the session, Home announces *"Restored 1 session from your backup."*, `phat:v1:log` on disk holds it, and the Settings backup stamp shows a push that followed.
- **F2** Non-empty device with 3 sessions, server has those 3 plus 1: open → 4 locally, the 3 byte-identical to before (QA snapshots the store), one announcement, and `phat:v1:recover:log:<ts>` exists **once** — a second open adds nothing, announces nothing, writes no second keep.
- **F3** Offline open: no pull attempted, no console error, no announcement, `phat:v1:log` byte-identical.
- **F4** Signed out: no pull. Demo store: no pull, and Settings says why (reuse the demo refusal).
- **F5** A draft with three typed sets on disk: the merge runs, the draft is byte-identical after, and Train still offers the draft with all three sets.
- **F6** A session saved while the pull is in flight: the save lands, the merge does not overwrite it (local wins on id; a new id is added to the merged set), and the following push carries it. QA drives this with the sync rig (throttled pull).
- **F7** The merge never repaints a screen with a focused input or an open sheet (W2's rule), asserted with an input focused during the pull.
- **F8** Foreign account on a non-empty device: no merge, the owner refusal names the owner, nothing written, nothing under `recover:*`.
- **F9** `S.blockWrites[LOG]` set (the H2 path): no merge, the store notice keeps the slot (B-40).
- **F10** `file://`: zero console output, no pull.

Depends on: W2, W3, and **the stop condition lifted** (cause confirmed on B-119).

### W5 · QA — owner: **qa-engineer**

Scope: M1–M12 as `tests.html` cases from `file://` (a new section, S43); F1–F10 driven in a browser with the
sync rig from WO-008 W7 against the live project with the throwaway account, not Chady's; W1's zero-write
assertion; the manual checklist gains one phone-only item (F1 on his phone, from both launch contexts).
The tripwire count moves; write the new number into the backlog.

Acceptance criteria:
- Every M and F criterion has a numbered case or a numbered rig step with the observed result.
- One regression test that the pull path **cannot** shrink `phat:v1:log` (assert `merged.log.sessions.length ≥ local` over a fuzz of 200 random local/remote pairs).
- `tests.html` reads `N / N / 0`; the two meta-tests still enforce zero expected failures.

Depends on: W3 (S43 can start on W3 alone), W4 for the F-series.

### W6 · Ship — owner: **release-engineer**

Scope: branch `wo-011-merge`, merge to `main` when W5 passes, deploy **all** files, verify `/logic.js`,
`/index.html`, `/sync.js` 200 with real content, `sw.js` per its header rule (**file list unchanged** unless
`diag.html` is added to it — it is not — so the per-launch refresh carries the change; release-engineer
rules whether `v6` is warranted and writes the reason in the header either way). Then: from Chady's phone,
**both** launch contexts, run F1 and record it on B-119.

Acceptance criteria:
- `scripts/verify-deploy.sh` passes for every file in the enumeration.
- His session `1789264514484` is on the phone in the context he uses, and its six entries match the server doc.
- `docs/deploy.md` gains the WO-011 deploy line.

Depends on: W5.

## 3. Sequence

```
W0 (main session asks Chady)  ──┬── cause confirmed ──────────────────────────┐
                                └── not confirmed → W1 diag.html (FE → RE) ──┤
W2 (ux) ∥ W3 (backend)  — start NOW, in parallel with W0/W1; they touch no deploy
W5 S43 (qa, on W3 alone)  — can start when W3 lands
                              stop condition lifted → W4 (frontend) → W5 F-series (qa) → W6 (release)
```

W2 and W3 are pure work on a branch and do not violate the stop condition; only W4's merge to `main` and
W6 wait on the cause. If W0 answers "H1" in the first reply, W1 is skipped and the critical path is W3 → W4.

## 4. Risks

- **Masking.** The exact reason for the stop condition: a merge on open hides a device that loses its log
  nightly. Mitigation: the confirmed cause on B-119 before W4 ships; `diag.html` stays deployed as a
  permanent read-only aid.
- **Local-wins can keep a worse copy.** If the phone's copy of a session is *older* than the server's
  (edited on another device), the phone's version wins and is pushed, superseding the server's into
  `conflicts`. Accepted by the ruling ("the phone is what he was typing on") and the server keeps the
  superseded doc in `conflicts`, so nothing is destroyed. Filed as B-121 (P3) for a later "newer wins by
  `client_updated_at`" discussion — not now.
- **A foreign merge would poison a log.** Guarded by `storeOwner`; F8 pins it.
- **The keep grows storage.** One keep per device, ever; the restore keeps already exist. Not a quota risk
  at his volume.
- **`sw.js`.** No shell file list change → no forced bump; but three shell files change content, and the
  per-launch atomic refresh carries them. If release-engineer bumps to `v6`, it must be for the file list
  rule, not "to be safe" (the WO-008 close recorded why `v4` stayed twice).
- **No migration.** Schema stays 6. Server schema unchanged. `prefs.merge` is a new optional key; a build
  without it boots unchanged.
- **The 01:55 push moved his doc into `conflicts`** (`superseded_by_update`) if the schema-6 migration
  changed the bytes — that row is the pre-migration copy and is a useful fixture. Do not delete it.

## 5. Needs from Chady

1. Q1–Q4 above. Nothing else moves until Q1 and Q3 are answered.
2. Confirmation he accepts **local wins** on a same-id collision (the phone's copy beats the server's).
   Assumed yes from "the phone is what he was typing on"; say so if not.
3. The design complaint: one sentence on *what* is ridiculous (the photographs, the load chip, the Home
   layout) so B-120 can be a real item and not a guess.

## 6. Dispatch list (for the main session)

1. **main session → W0.** Ask Chady Q1–Q4 verbatim. Record answers on B-119. If Q1 or Q3 confirms H1/H1′,
   mark the cause and skip W1.
2. **ux-designer → W2** (parallel, now). Brief: one page — the merge announcement lines, Settings → Backup
   wording for merge success/refused/offline/owner (reuse `ownerRefusal` with kind `"merge"`), and a
   testable rule for when a merge may `render()` (no open sheet, no focused input, not mid-session). Voice per
   CLAUDE.md §4. No design-complaint work.
3. **backend-engineer → W3** (parallel, now, branch `wo-011-merge`). Brief: `PHAT.mergeStores(local, remote)`
   pure in `logic.js`, union by id / date / plan id, local wins byte-for-byte, nothing removed, remote docs
   through `restorePayload` + `migrateStore` first, refused docs named not blocking, `Date.now()` never
   inside. Criteria M1–M12. No schema bump, no `sync.js` change unless `pull()` lacks a column. Commit named
   paths only.
4. **frontend-engineer → W1** (only if W0 does not settle it). Brief: `diag.html`, read-only, one IIFE,
   prints display mode, every `phat:v1:*` store status/size/schema/session ids, every `recover:*` key,
   other key names, SW scope + cache names, network `sw.js` VERSION + `/logic.js` status/content-type, and a
   44 px COPY ALL. Zero writes. Not in the SW shell list. No change to the four app files.
5. **release-engineer → W1 deploy** (after 4). Brief: upload `diag.html` **only**; verify 200 `text/html`;
   re-verify `/logic.js` and `/index.html` hashes equal the 11c44ff verification; do not touch the shell.
6. **qa-engineer → W5 S43** (when W3 lands). Brief: M1–M12 as `tests.html` cases from `file://`, plus the
   200-pair fuzz that the merge never shrinks a store; W1's zero-write check if W1 shipped.
7. **STOP. Main session confirms the cause on B-119 and in `docs/decisions.md`.**
8. **frontend-engineer → W4** (after 7, W2, W3). Brief: `mergeOnOpen()` before `backupSoon("open")`, after
   sign-in and on `online`; keep-once via `restoreSteps`' keep path stamped in `prefs.merge`; `storeOwner`
   on `storesOnDisk()`; demo/blocked/signed-out/`file://` guards; W2's copy and repaint rule; F1–F10.
9. **qa-engineer → W5 F-series** (after 8). Brief: F1–F10 on the rig with the throwaway account; the fuzz
   against the wired path; one new phone-only checklist item; new tripwire count into the backlog.
10. **release-engineer → W6** (after 9). Brief: merge `wo-011-merge` to `main`, deploy all, verify every
    file, rule on `sw.js` version by the file-list rule and write why, then F1 from Chady's phone in both
    launch contexts, recorded on B-119.
