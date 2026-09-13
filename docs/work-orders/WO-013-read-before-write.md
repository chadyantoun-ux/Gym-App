# WO-013 — Read before write: every store write overlays the disk, and nothing leaves a store as a side effect of a stale tab

Owner: `project-manager` · Filed: 2026-09-13 · Status: **specified** · Branch: `wo-013-read-before-write`
Promotes and closes **B-76, B-123, B-124, B-128** (one class, one fix). Files B-132, B-133.
Interim on his phone until this merges: **close every other tab of the app** — one document, no race.

---

## 0. Ask

Chady set *I lift in: lb*. His `diag.html` on the live build (`65465c3`, every marker current) prints
`prefs.gym = {bars:[…]}` — no `unit`, no `ex`. The write path is proven on production with his exact
prefs (tap `lb` → persisted → survives reload → the card is in lb). So the setting was written and then
**overwritten**.

The evidence on his device: `prefs.backup.at = 1789318533835` (16:55 UTC), `prefs.merge.at =
1789342088400` (23:28 UTC), `recover:log` / `recover:bw` at 23:28:05 with `reason=merge`. `mergeOnOpen`
ends with `save(PREFS, prefsPayload())` — **from memory**. A second Safari tab on the same storage that
booted before he tapped `lb` carried no `unit` in memory; its merge at 23:28 wrote its stale prefs over
the disk. That is B-124 (the merge's prefs write is from memory) and B-128 (a stale tab's Settings write
wipes the unit) — both reproduced by QA, both filed P3, both now on his phone. B-76 (a stale tab writes
one session over ten) and B-123 (the merge leaves a tab stale) are the same class.

**One sentence:** every write to `PREFS`, `LOG`, `BWK` and `PLANS` re-reads the key from disk
immediately before writing and overlays what the caller changed onto what is there, so a key or a
document that is on disk and not in this tab's memory is **kept**; a removal is explicit and named,
never a side effect of a stale `S`.

## 0.1 Reading of it

**The class, stated once.** Every one of the four stores is written as a whole object built from `S`
(`logPayload()`, `bwPayload()`, `plansPayload()`, `prefsPayload()`), and `save()` writes those bytes
without looking at the disk. Two documents on one storage — two Safari tabs, the installed app plus a
tab, Safari plus the in-app browser view a tapped link opens — each hold their own `S`, and whichever
writes last wins whole. WO-011 closed the READ side of this (B-74: keeps, counts and the export read
disk; the merge's F6 loop proves the bytes it overwrites are the bytes it merged from). The WRITE side
is untouched: `finish()` writes `S.sessions.concat([sess])`, `gymCommit` writes `gymBase()` spread from
`S.prefs.gym`, the stamp and the merge record write `S.prefs` whole.

**Why overlay, not refuse.** B-76's row carried the fix shape "read the key first and *refuse*, naming
the reload, when the bytes differ from what this document last loaded". I am not building that.
`[Certain]` a refusal on `finish()` is a tab in the gym that will not save a session until he reloads
— the draft survives the reload, but the failure mode is "Save does nothing until you do a thing", on a
phone, between sets, and the thing it asks for is the one that B-01 exists to make unnecessary. An
overlay never refuses and never loses: the stale tab's session lands *beside* the ten it did not know
about, its memory adopts the eleven, and the screen tells the truth. The refusal shape is the right
answer only when a merge cannot be defined — and for these four stores it can: sessions union by id,
bodyweight by date, plans by planId, prefs key by key with `gym.ex` per id and the two stamps by
newest `at`. `PHAT.mergeStores` already unions the same three arrays for the server pull; this is the
same rule on the local write. Recorded in `docs/decisions.md`.

**What is exempt.** `phat:v1:draft` is per-tab by nature (WO-001; one draft, one screen) and stays
exactly as it is. `phat:v1:planedit` (the editor's working copy, keyed by planId) is the same kind of
thing and stays. `phat:v1:recover:*` keeps are write-once verbatim copies of raw bytes and stay.
Nothing about `recover:*` — when a keep is taken, its key, its shape, its once-per-device stamp — moves.

**What this does not fix, said now (B-132, B-133).** Two collisions are decided "memory wins", which
is today's behaviour and is stated rather than hidden:
1. **A scalar key present on both sides** — `includeCut`, `activePlanId`, `restAuto`, `onboarded`,
   `proteinDate`, a `logMeta` key — takes the writer's value. The patch form (§2.2) removes almost all
   of this by having each site name only the key it changes; what remains is a stale tab changing a
   setting the other tab also changed, which is one re-tap.
2. **A document present on both sides under one id** takes the writer's bytes. Sessions are immutable
   today (B-05, editing history, is not built); bodyweight is an upsert by date where the newer tap
   *is* the intent; a plan under one planId is the editor's SAVE PLAN. When B-05 lands, its writes must
   be patches on one session, not a whole array — B-133 pins that as B-05's precondition.
3. **`gym.bars` replaces, never unions.** A bar he deletes in Settings must stay deleted; a union
   would resurrect it. Cost: a stale tab's bar save drops a bar the other tab added since — a setting,
   one re-add, and the unit and every override survive it (which is the whole point). B-132.

## 1. Constraint & backlog check

- `CLAUDE.md` §3.3 (never lose a number) is the constraint this order *serves*; §3.2 (offline-first)
  holds — the re-read is a local storage read, no network anywhere in the write path. §3.1: no build,
  the pure half lives in `logic.js` as a classic script. §3.8: branch, merge on QA's pass.
- B-01/B-02/B-03 closed (WO-001). B-76, B-123, B-124, B-128 promoted here and closed against this
  order. B-74 (read side) is the precedent and stays closed.
- Nothing else in flight touches `save()`. WO-012b is merged. The `diag.html` markers are current.
- The standing diagnosis, once: this is the fourth order in one day on the store layer and there is
  one logged session. It is also a real loss of a setting he asked for, on his phone, tonight, and
  the class behind it puts a session logged offline on no row anywhere (B-76 S44). It is built.

## 2. The rule (backend implements; every owner reads)

### 2.1 `save(k, obj, opts)` for `k` ∈ {`LOG`, `BWK`, `PLANS`, `PREFS`}

1. `S.blockWrites[k]` refuses as today (unchanged sentence).
2. **Read the key now** — `readRaw(k)` inside `save()`, after any `await` the caller did, never a cached read.
3. Base:
   - `ok` → `base = disk value`.
   - `absent` → `base = the store's memory payload` (`logPayload()` / `bwPayload()` / `plansPayload()` /
     `prefsPayload()`), so the first write of a store carries `schemaVersion` and every meta key as
     today.
   - `error` → **refuse**. `S.err = "Not saved. The stored copy of this data could not be read and must
     not be overwritten. Export, then reload."` (the existing sentence), return `false`. Today this
     path overwrites whatever is there; a store that read at boot and is unreadable now is a storage
     fault mid-session, and the only safe write is none. Every caller already handles `false`
     (the draft stays on disk; the number stays on screen; the setting holds until reload).
4. `next = PHAT.overlayStore(kind, base, obj, opts)` — §2.3. With `opts.replace === true` the overlay
   is skipped and `next = obj` (restore only; §2.4).
5. **Shrink guard, asserted not assumed:** unless `opts.replace`, `next`'s `sessions` / `entries` /
   `plans` count ≥ `base`'s, and every top-level key of `base` is present on `next` except those named
   in `opts.drop`. A violation refuses the write with `S.err = "Not saved. This write would remove
   saved data. Reload and try again."` and a `console.error` naming the key. It cannot fire by
   construction; it is the tripwire that says so.
6. Write `next`. Then as today: `S.stores[...]="ok"`, `backupSoon(k)` for the backed-up three, return
   `true`.
7. **Adopt.** If the overlay folded in anything this tab did not have (`overlay.kept` non-empty), the
   tab's memory takes `next`: `adoptLog` / `adoptBw` / `adoptPlans` / `adoptPrefs` (the boot prefs
   reader, factored into a function — the same validation, the same `gymAdopt`, no boot write). Memory
   never lags disk after its own write — B-123's rule, in the direction that closes B-76's stale page.
   `save()` returns `{ok:true, kept}`-shaped truth through `S.lastWrite[k]`; its return value stays a
   boolean so no caller changes shape.

### 2.2 Two forms, both allowed; the patch form is the default for a single-key intent

- **Patch:** `save(PREFS, {restAuto: true})`, `save(LOG, {sessions: next})`, `save(PREFS, {gym: g})`.
  `obj` holds only what the caller changes. Deep keys (`gym.unit`, `gym.ex.<id>`, `backup`, `merge`)
  merge by §2.3's per-store rule.
- **Whole:** `save(LOG, logPayload())`. Allowed where the caller has just read disk into memory (the
  boot migration, `mergeOnOpen`'s writes). The overlay still runs; it is a no-op when disk is what
  memory holds.
- **Removal:** `opts.drop = ["calChanged", "gym.ex.d1a", "reintroOrder.d3"]` — dotted paths, applied
  after the overlay, the only way a key leaves a store. `opts.replace = true` — the only way an array
  shrinks; restore only. Both are named at the call site, so a `grep` finds every removal in the app.
- **Meta diff helper:** `PHAT.metaPatch(before, after)` → `{set:{…}, drop:[…]}` for the `logMeta`
  sites (`setCalStamp`, `v1Answer`, `answerDeload`, `savePlan`'s reintro write), where the engine
  returns a whole next-state and the site must not have to know which keys the engine deleted
  (`clearCalChanged`, `endDeload`, `declineReintro` all delete keys).

### 2.3 `PHAT.overlayStore(kind, disk, mem, opts)` — pure, in `logic.js`, no DOM, no `S`

Returns `{value, kept:{keys:[…], sessions:[id], entries:[date], plans:[planId], ex:[id]}, notes:[…]}`.
`kept` lists what was on disk and not in `mem`. Never throws; a throw is `{value: mem, kept: empty,
notes:[msg]}` and `save()` treats it as the whole form (memory wins, today's bytes).

Key order: **`disk`'s keys in `disk`'s order, then `mem`'s new keys in `mem`'s order.** On a disk this
build has written once that is the builder's order, which is what makes §3's single-tab byte-identity
provable rather than hoped.

| kind | rule |
|---|---|
| `log` | `sessions`: **union by `id`** — `mem`'s elements in `mem`'s order, plus disk-only ids, then `sortSessions` (stable). Same id → `mem`'s bytes (B-133). Every other key: `mem` wins where present, disk-only kept. |
| `bw` | `entries`: union by `date` — `mem`'s order, disk-only dates appended. Same date → `mem`. Other keys as `log`. |
| `plans` | `plans`: union by `planId` — `mem`'s order, disk-only appended. Same id → `mem`. `activePlanId` and every other key: `mem` wins where present. |
| `prefs` | Top-level: `mem` wins where present, disk-only kept. **`gym`** deep: `unit` `mem` where present; `bars` **replace** where present (B-132); `ex` per id — `mem`'s records win, disk-only ids kept; an `ex` that ends `{}` is absent. **`backup`**: the record with the greater `at` wins whole (a stamp never regresses — B-124); equal `at` → `mem`. **`merge`**: `keptAt` = the greater of the two (a keep is never un-spent), `at` = greater, `n/m/p` from the side with the greater `at`. |

The shrink guard in §2.1.5 is computed from the same result, in `save()`, and pinned separately.

### 2.4 The site table (frontend audits; this is the contract, not a suggestion)

| Site | Store | Form after WO-013 | Removal |
|---|---|---|---|
| `gymCommit` (via `gymWrite`, `setGymUnit`, `writeRec`) | PREFS | patch `{gym: next}` — deep per §2.3 | — |
| `clearOverride` | PREFS | patch `{gym: next}` + `drop:["gym.ex."+id]` | named |
| `setRestAuto` | PREFS | patch `{restAuto}` | — |
| `toggleProtein` | PREFS | patch `{proteinDate}` (`""` is a value, not a drop) | — |
| `finishOnboarding` | PREFS | patch `{onboarded:true}` | — |
| backup stamp (`runBackup`, ~7192) | PREFS | patch `{backup}` — newest-`at` rule | — |
| `stampKeep` | PREFS | patch `{merge:{keptAt}}` | — |
| `mergeOnOpen` final write | PREFS | patch `{onboarded?, backup?, merge}` | — |
| `restoreApply` stamp | PREFS | patch `{onboarded?, backup}` | — |
| boot override pass (~8093) | PREFS | patch `{gym: S.prefs.gym}` | — |
| `finish` | LOG | patch `{sessions: next}` — union by id | — |
| `setCalStamp` | LOG | `metaPatch` → set + drop | `calChanged` |
| `v1Answer` | LOG | `metaPatch` | reintro keys |
| `answerDeload` | LOG | `metaPatch` | `deload` keys |
| `savePlan` reintro write | LOG | `metaPatch` | `reintroOrder.<did>` |
| boot migration / profile pass | LOG | whole `logPayload()` — overlay no-op on a just-read disk | — |
| bodyweight entry (~5330), `finishOnboarding` bw | BWK | patch `{entries: S.bw}` — union by date | — |
| boot `m.bwChanged` | BWK | whole | — |
| `savePlan`, USE THIS PLAN (~4552), duplicate (~4643) | PLANS | patch `{plans}` / `{activePlanId}` / `{plans}` — union by planId | — |
| boot `m.plansChanged` | PLANS | whole | — |
| `mergeOnOpen` `st.writes` | LOG/BWK/PLANS | whole, overlay (a no-op when F6's bytes held; safe when they did not) | — |
| `restoreApply` `st.writes` | LOG/BWK/PLANS | whole, **`replace:true`** — REPLACE is his word on the sheet and the keep precedes it | named |
| keeps (`k.key` = `recover:*`), `DRAFT`, `EDITS` | — | untouched | — |

Whole-form `prefsPayload()` survives only as the absent-disk base and for the backup payload.

---

## 3. Work items

### W1 · The overlay and the adapter — owner: `backend-engineer`

**Scope.** `PHAT.overlayStore` and `PHAT.metaPatch` in `logic.js` (pure, exported on `window.PHAT`);
`save()` per §2.1 in `index.html`; `adoptPrefs(value)` factored from the boot prefs reader with the
boot calling it (zero behaviour change at boot: same validation, same `gymAdopt`, same `S.gymKeep`,
same "no boot write"); adopt-after-write for the four stores; the B-123 clause in `mergeOnOpen` —
after the F6 loop, when `st.writes` is empty and the second disk read holds a log / bw / plans that
is not what memory holds (by `stableJson`), adopt the disk and `render(true)` if `mayPaint()`.
Pins for every rule in §2.3 in `tests.html`'s pure section (QA folds and owns the count). **Out:**
touching any call site (W2), `mergeStores` itself, the draft, `recover:*`.

**Acceptance criteria.**
- A1 `overlayStore("prefs", {bars:[b]}, {gym:{unit:"lb"}})` → `gym = {bars:[b], unit:"lb"}`; the
  reverse (disk `{bars, unit:"lb", ex:{d1a}}`, mem `{gym:{bars:[b2]}}`) → `{bars:[b2], unit:"lb",
  ex:{d1a}}` with `kept.keys` naming `gym.unit`, `kept.ex = ["d1a"]`. **B-128 on the row, pure.**
- A2 `overlayStore("prefs", disk with backup.at = T+1, mem with backup.at = T)` → `backup.at = T+1`,
  whole record from disk; `merge.keptAt` = max of the two sides. **B-124 pure.**
- A3 `overlayStore("log", disk 10 sessions, mem 1 session)` → 11, sorted, `kept.sessions` lists the
  ten ids; same id on both → mem's bytes, count 10. **B-76 pure.**
- A4 `bw` union by date, `plans` union by planId, `activePlanId` mem wins, disk-only meta keys kept.
- A5 **Byte-identity:** for each of the four stores, a disk fixture written by today's builder and a
  mem = the builder's output after one ordinary change (a session appended; a bw entry; a plan; a
  unit tap): `JSON.stringify(overlay.value) === JSON.stringify(mem)`. Pinned for all four.
- A6 `drop` removes exactly the named paths and nothing else; `["gym.ex.d1a"]` on an `ex` with two ids
  leaves one; on one id leaves `gym.ex` absent. A path not present is a no-op, not an error.
- A7 `metaPatch(before, after)` — for `setCalChanged`, `clearCalChanged`, `startDeload`/`endDeload`,
  `acceptReintro`/`declineReintro` on fixtures: `set` holds only changed keys, `drop` names every key
  `after` lacks; applying `set` + `drop` to `before` equals `after` (stableJson).
- A8 `save()` on `readRaw` `error` refuses with the existing sentence, writes nothing, returns
  `false`; on `absent` writes the memory payload with the patch applied (a first-ever `finish()` on an
  absent log store produces the same bytes as today).
- A9 The shrink guard: a hand-built `overlayStore` result missing a base key or shorter in `sessions`
  is refused by `save()` with the named sentence and a `console.error`; pinned by stubbing the
  overlay, not by finding a real path (there is none).
- A10 Adopt-after-write: after a `save(LOG, {sessions:[one]})` on a disk with ten, `S.sessions.length
  === 11` in the writing document. After a `save(PREFS, {gym:{bars}})` on a disk with `unit:"lb"`,
  `gymUnit() === "lb"` in the writing document.
- A11 Boot with `adoptPrefs` factored: the four WO-012b D6 profiles boot to byte-identical `S.prefs`,
  `S.gymKeep`, `S.gymBad`, `S.prefsBad` against `main @ 65465c3`, and neither build writes on boot.
- A12 `mergeOnOpen` B-123: two documents, both booted on a wiped log, one merges ten from the server
  and writes; the other's second disk read shows the ten, it writes nothing — and now adopts them,
  its header reads ten, its push stamps `n:10`, not `Backed up 0 sessions`.
- A13 `recover:*`: the keep count, keys and bytes across a boot-with-unreadable-store, a merge and a
  restore are identical to `main @ 65465c3` (QA diffs; backend asserts nothing in that path changed).

**Depends on:** —

### W2 · Every call site on the table — owner: `frontend-engineer`

**Scope.** §2.4, row by row: each site to its named form; `drop` where the table says; `replace:true`
on `restoreApply`'s three writes and nowhere else; the `adoptPrefs` adoption's on-screen consequence
(a Settings segment or a card chip that now reads disk's unit after this tab's own write repaints —
`paintGymUnit` / `paintMode` / `render(true)` as the screen requires, no new copy: the screen shows
the truth, it does not announce it). A one-line comment at every `drop` and `replace` naming why.
**Out:** any change to what a site writes beyond its form; any new setting; UX copy.

**Acceptance criteria.**
- F1 `grep -n "save(" index.html` shows every one of the four stores' sites in one of the three forms;
  `replace:true` appears exactly three times, all inside `restoreApply`; every `drop` has its comment.
- F2 Tab B booted before tab A tapped `lb`; B saves a bar → disk `gym = {bars:[…], unit:"lb", ex:{…}}`
  with A's override intact; B's Settings segment now shows `lb` pressed. **B-128, first half.**
- F3 Tab A has an override on `d1a`; tab B (stale) taps a unit → A's `d1a` record is on disk
  byte-identical. **B-128, second half.**
- F4 Tab A clears `d1a`'s override → `gym.ex.d1a` gone from disk; every other id kept; the drop is the
  named one.
- F5 `setCalStamp(false)` removes `calChanged`; `setCalStamp(true)` sets it; a stale tab's `finish()`
  in between keeps whichever is on disk (it writes `{sessions}` only).
- F6 Every `logMeta` site: a sequence set → stale-tab finish → clear leaves disk meta equal to what a
  single tab produces, and eleven sessions.
- F7 A bw entry on the same date from two tabs → one row for the date, the later tap's kg; a bw entry
  on two dates from two tabs → both rows.
- F8 Restore (REPLACE typed) still replaces: ten on disk, three on the server → three on disk, the
  keep holds ten. Unchanged from today.
- F9 A failed prefs write (storage stubbed to throw) on `setGymUnit` / `gymWrite` / `clearOverride`
  leaves memory as before and the chip / segment repainted — WO-012b's P3 (stale chip line after a
  failed write) closes in passing if the repaint lands; note it either way.

**Depends on:** W1 (the adapter's signature and `metaPatch`). The table can be prepared in parallel
against §2.4; the branch merges after W1.

### W3 · Verification — owner: `qa-engineer`

**Scope.** Fold W1's pins; the suite count on the page; the **two-tab rig** (Playwright, two pages on
one context, `file://` or the branch on a local port, CDN and Supabase blocked; the WO-011 W5 / WO-012
W5 rig); the single-tab byte-identity diff against `main @ 65465c3`; the attack list; mutants.

**Data criteria — all zero loss, all observed, every one names the bytes.**
- Q1 **B-76, 1-over-10.** Tab B boots on an empty log; tab A restores ten (or the merge brings ten);
  B logs one and taps Save → disk holds **eleven**, sorted, all ten ids present byte-identical; B's
  screen shows eleven; B's push stamps `n:11`. Repeat with A's ten never pushed (offline): eleven on
  disk. **The S44 hole is closed:** a session logged offline and then written over by a stale tab is on
  disk.
- Q2 **B-128, unit wiped by a bar save.** Exactly WO-012 W5 attack 5: tab B booted before tab A chose
  lb; B saves a bar → `unit:"lb"` on disk; B taps a unit → A's override on disk. Plus the reverse
  order (A saves a bar after B set the unit).
- Q3 **B-124, stamp regressed by a merge.** WO-011 W5 F6: tab B's push stamps `backup` (n+1, new
  sig) during tab A's held pull; A's merge completes → disk `backup.at` is B's (the greater), B's
  sig; A's memory holds it too (adopted); the next push is a signature no-op. `merge.keptAt` never
  goes backwards across two tabs' merges, and `recover:log` exists **once**.
- Q4 **Chady's exact shape.** Tab A: Settings → `lb`, override on one card, a bar. Tab B (booted
  earlier): one merge-on-open (`reason=merge`), one push, one bar save, one `finish()`. Disk after all
  of it: `unit:"lb"`, the override, A's bar and B's bar (B's bar save replaces the list — B-132 —
  state what is on disk and that the unit and override survived), every session.
- Q5 **Single-tab byte-identity.** On stores seeded by `main @ 65465c3` (the four WO-012b D6 profiles
  plus his session `1789264514484`), drive: a session logged, a bw entry, a unit tap, a bar save, an
  override set and cleared, `setCalStamp` on and off, a deload answer, a plan saved and USEd, a push
  stamp, a merge on an unchanged server, onboarding. After each write, `phat:v1:log`, `phat:v1:bw`,
  `phat:v1:plans`, `phat:v1:prefs` are **byte-identical** between the branch and `main` (draft
  `savedAt` excepted as before). The number of storage reads per write may grow by one; the bytes
  may not change.
- Q6 **The draft.** Across every scenario above, `phat:v1:draft` is byte-identical to `main`'s at the
  same step, and two tabs each holding a draft keep their own (today's behaviour — stated, not
  changed).
- Q7 **`recover:*`.** Boot with an unreadable log; a merge on a non-empty device; a restore: the keep
  keys, count and bytes equal `main`'s. No new keep is minted by any overlay write.
- Q8 **Refusal on unreadable.** Storage returns garbage for `phat:v1:log` after boot; `finish()` →
  `false`, the existing sentence, the draft still on disk with every set, nothing written to the log.
- Q9 The suite: `N / N / 0`, both meta-tests green, the checklist's "already proven" items each still
  carrying evidence; the count recorded on the page.

**Attack list (QA extends; these are the floor).** (1) `prefs.gym = "garbage"` on disk, a tab writes
a unit — no throw, the refusal path or the overlay path, named. (2) A disk `sessions` element with no
`id` — union treats it as unique by reference, it is never dropped. (3) Two tabs `finish()` within the
same tick (the second's read sees the first's write or not) — twelve, never eleven-with-one-missing.
(4) `drop` on a path through `null`. (5) `overlayStore` handed `disk` as an array (a corrupted store)
— refused, memory bytes, `notes` says so. (6) `backup.at` a string on one side. (7) A `plans` element
with a duplicate `planId` on disk already. (8) The shrink guard tripped by a mutant that filters
`sessions` — refused, sentence, nothing written.

**Depends on:** W1 + W2 merged to the branch.

### W4 · Release — owner: `release-engineer`

**Scope.** Merge `wo-013-read-before-write` to `main` on W3's pass; deploy per `docs/deploy.md` (every
file; `sw.js` version per the same-list rule — the file list is unchanged, so the marker check on
`diag.html` is the proof, not the version); `sh scripts/verify-deploy.sh`; `/logic.js` 200 with
`application/javascript` and the `overlayStore` export visible in the served bytes; the `tests.html`
count on production equals the branch's.

**Acceptance criteria.** R1 all four app files and `tests.html` byte-verified on production. R2 his
phone: `diag.html` markers current, and after **one** bar save from Settings on the fresh build with
`lb` re-selected, `prefs.gym` prints `unit:"lb"` and keeps it across a reload and across a second tab's
open. R3 Nothing on the server changed by the deploy (row counts before and after).

**Depends on:** W3.

---

## 4. Sequence

```
W1 backend (overlay + save + adoptPrefs + B-123 clause)  ──┐
W2 frontend (site table, prepared in parallel, lands after W1's signature) ──┤
                                                            ├──> W3 QA ──> W4 release
```
W1 and W2 can be dispatched together: W2's table is fixed by §2.4 and W1's signature is fixed by
§2.1–2.3, so frontend can write against it and rebase on W1's commit. **Nothing on this branch is
serial with any other order.** Commit named paths (CLAUDE.md §4b): backend `logic.js index.html
tests.html`, frontend `index.html`, never `-A`.

## 5. Risks

- **Byte-identity on a store an old build wrote.** §2.3's key order is disk-first; a store last written
  by a pre-schema-6 build in a different order stays in that order rather than being re-canonicalised
  by the next write. Harmless (readers are key-order-blind, `stableJson` everywhere it matters), but
  Q5's diff is defined on stores seeded by the current build for this reason. Stated.
- **The absent-disk base.** A patch on an absent store must produce today's first-write bytes; A8 pins
  it. A miss here is a log with no `schemaVersion`, which the migration would then treat as v1.
- **`adoptPrefs` factoring.** The boot prefs reader is ~80 lines with `gymAdopt`, `S.gymKeep`,
  `S.ovMigrated` and the backup-owner normalisation; moving it is the one refactor in this order and
  A11 pins it against `main` on four profiles.
- **Adopt-after-write mid-session.** A `finish()` that adopts ten sessions it did not know about
  changes the Train tab's counts and the next card's ghost mid-flow. Correct, and the draft was just
  cleared by that same `finish()`, so nothing typed is under the repaint. `paintMode` on a card during
  an override write that adopts a disk-only unit repaints the chip — F9 covers the failure branch.
- **Restore's `replace:true` is the only shrink path** and it is behind a typed REPLACE and a keep.
  Any future site that needs to remove a document must use `drop` / `replace` by name; the guard
  refuses everything else. B-05 will need per-session patches (B-133).
- **Server:** nothing. No sync change; `mergeStores` untouched; the push payload is built from memory
  after adoption, so it can only grow.
- **Performance:** one extra `readRaw` per write; localStorage reads of a ~100 KB log are sub-ms.
  On the `window.storage` bridge the read is an `await`; every `save()` is already `await`ed.

## 6. Needs from Chady

None to build. Interim, already told: **close the other tabs** — one document on his phone until W4.
After W4: re-tap `lb` once (the setting was overwritten, not migrated; nothing brings it back but a
tap), and re-set any per-exercise override he had made.

## 7. Dispatch list (for the main session)

1. `backend-engineer` → **W1**, brief: *Read `docs/work-orders/WO-013-read-before-write.md` §2 and
   §3 W1. Build `PHAT.overlayStore(kind, disk, mem, opts)` and `PHAT.metaPatch(before, after)` in
   `logic.js` (pure, exported, classic script). Change `save()` in `index.html` to read the key first
   and overlay per §2.1 — `error` refuses, `absent` bases on the memory payload, shrink guard, adopt
   after write. Factor the boot prefs reader into `adoptPrefs(value)` with zero boot change. Add the
   B-123 adopt-disk clause after `mergeOnOpen`'s F6 loop. Pin A1–A13 in `tests.html`. Do not touch call
   sites — that is W2. Branch `wo-013-read-before-write`; commit named paths.*
2. `frontend-engineer` → **W2** (parallel with W1; land after W1's commit), brief: *Read WO-013 §2.4
   and §3 W2. Convert every `save()` site on the table to its named form — patch, whole, `drop`, or
   `replace:true` (restore only, three times). Wire the repaint where an adoption changes what is on
   screen. Verify F1–F9. No new copy, no new settings. Same branch, `index.html` only, commit named
   paths.*
3. `qa-engineer` → **W3**, after W1 + W2: *Read WO-013 §3 W3. Fold W1's pins, run the two-tab rig on
   Q1–Q4 exactly as written, the single-tab byte diff Q5 against `main @ 65465c3`, Q6–Q9, the attack
   list, mutants. Pass or fail each criterion by name with the observed bytes. Record the count.*
4. `release-engineer` → **W4**, on W3's pass: *Merge, deploy every file per `docs/deploy.md`, verify
   `/logic.js` served with `overlayStore`, `scripts/verify-deploy.sh`, R1–R3.*
5. `project-manager` → close: B-76, B-123, B-124, B-128 done against WO-013; B-132/B-133 stand;
   `docs/backlog.md` and `docs/decisions.md` updated (the entry is written at filing, below).
