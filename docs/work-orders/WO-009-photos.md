# WO-009 — Exercise photographs replace the stick figures, plus `Change password`

Written 2026-09-12 by `project-manager` against `main @ 6e3aa82`. Two lanes, two branches, one order.

---

## 0. Ask

Replace the 15 hand-authored SVG stick-figure patterns with real exercise photographs from
`free-exercise-db`, one start/end pair per PHAT slot where a matching exercise exists; and, separately
and small, give a signed-in user a `Change password` control in Settings.

Chady, verbatim, across two messages: *"also the movement and cue visuals sucks, what do you need to
make these better it's not clear at all"* — offered photographs (option 1) or image-model generation
(option 2) — *"ok do it, option 1 is good"*.

## 0.1 Reading of it

- **This is the third time** he has said the figures are unclear: B-60/B-64 (the rebuild against §11.5),
  WO-005's occupancy rebuild (own viewBox per pattern), and now. The stick-figure approach has hit its
  ceiling and is retired, not iterated. `POSES`, `PAT`, `diagram()`, `limb()` and `figSeq` are deleted.
- The **cues stay**. The 42 `ex.cue` strings are signed off (addendum §10.2) and were never the
  complaint. Rule Q1 is untouched. `cueFor()` is untouched.
- **Rule F1 still governs.** A photograph of a different variation is a wrong figure exactly as a wrong
  stick figure was, and the addendum's rule — a missing figure is a smaller loss than a wrong one — is
  the rule that decides every slot. The coach reviews each photo pair against the slot's cue, not
  against its name.
- **Where the map lives changes.** `PAT` sat in `index.html`, unreachable from `tests.html` on
  `file://`, and contradicted the 2026-09-10 ruling "no slot id survives in code outside the plan
  document". The photo map ships as a `fig` field on the shipped `PHAT_PLAN` slots in `logic.js`,
  resolved by shipped id through `PHAT.exById(PHAT.PHAT_PLAN, id)` and gated by `shippedName()` exactly
  as `hasFig()` is today. `validatePlan` already tolerates unknown exercise keys and `copyPlan` carries
  them byte for byte, so a stored plan copy needs no migration and `SCHEMA_VERSION` does not move.
- **Standing diagnosis, raised and then set aside on his answer:** this is the fourth tooling ask since
  the deploy and the log still holds zero sessions. He was told, he chose option 1. Built properly.

## 0.2 Constraint & backlog check

| | |
|---|---|
| CLAUDE.md §3.1 no build step | Photographs are files in `assets/ex/` referenced by relative path. `<img src="assets/ex/…">` works from `file://` and from static hosting. The download/resize script is a **developer tool** run once by `release-engineer`, like `scripts/make-icons.mjs`; nothing at runtime depends on it. Not a build step |
| §3.2 offline-first | Every photo is precached by `sw.js`. No runtime fetch from any other origin, ever. A photo the cache does not hold renders **nothing** (no broken-image glyph), and the cue carries the slot |
| §3.3 never lose a number | No store key is touched. `phat:v1:log`, `bw`, `draft`, `plans`, `prefs` unchanged. `SCHEMA_VERSION` stays 4 |
| §3.6 44 px | The disclosure control `.showfig` is unchanged (measured 44 in WO-004 W6 after B-43). Photos are not controls |
| §3.7 secrets | None involved. The Unlicense text is committed; no token |
| `wo-004-screens.md` §11.6 | **Conflicts on purpose.** §11.6 forbids `<img>`, external files and rasters. That was the UX designer's rule for the SVG approach, not a §3 constraint; Chady's decision overrides it and `ux-designer` rewrites §11 in W2 |
| Deploy enumeration | `docs/deploy.md`, `scripts/verify-deploy.sh` and `sw.js` each enumerate the eleven files. This order makes it 11 + N with N ≈ 60. **A hand-kept list of 70 paths is a list nobody checks** — W3 makes the photo list generated from one manifest and cross-checked by script, never by eye |
| Backlog | B-60 and B-64 (awaiting QA on the SVG rebuild) are **superseded** — the artwork they cover is deleted. B-15 (marker ids) is moot once no SVG is rendered. B-98 (archive guard blocks self-delete) touches the throwaway account clean-up in W8. Files **B-101–B-105** below. No open P0 |
| Blocking P0s | None. B-01/02/03/21 closed in WO-001 |

## 0.3 Source facts, verified 2026-09-12 by fetching them, not from memory

- Repository `yuhonas/free-exercise-db`, `main @ a859101d633a01c4a1a920d6a8ce41dabba0705f` (pinned; W3
  downloads from this SHA, never from `main`).
- Licence: **The Unlicense** (public domain) — GitHub API `license.spdx_id: "Unlicense"`, and
  `LICENSE.md` at the root begins *"This is free and unencumbered software released into the public
  domain."* `[Certain]`. No attribution obligation; W3 attributes anyway.
- Index: `dist/exercises.json`, 873 exercises, each with `images: ["<id>/0.jpg", "<id>/1.jpg"]`.
  Raw URL shape: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/<sha>/exercises/<id>/0.jpg`.
- Sample `Barbell_Squat/0.jpg`: **850 × 567 JPEG, 72.8 KB**, `image/jpeg`. At 320 px wide and JPEG
  q≈75 that is `[Likely]` 12–20 KB per file, so ~31 distinct exercises × 2 ≈ **62 files ≈ 1.0–1.3 MB**
  — inside the 1–2 MB he agreed to.

---

## 1. Work order — Lane A, photographs (branch `wo-009-photos`)

### W1 · The slot → photo map — owner: `strength-coach`

**Scope.** For each of the 42 shipped slots, either one `free-exercise-db` exercise id or **none**.
Review the two photographs, not the exercise name: the question per slot is *"does this pair show the
movement the cue describes, on the apparatus the cue names, such that copying the photograph does not
teach a different lift?"* Rule F1 applies unchanged — F1.1 ground reference and load path, F1.2
direction of travel (now: the two frames show the same end positions), F1.3 the cue corrects any
position the photo gets wrong only where he could adopt it. Reaffirm or strike the two F1.3
dependencies (`d4h` `hips bent`, `d5b` `30–35°`) — a photo of the right variation may make them
unnecessary; say which.

The PM's **draft**, to be confirmed or struck slot by slot — a draft, not a ruling:

| Slot | Name | Draft id | Note for the coach |
|---|---|---|---|
| d1a, d3a | Bent-over row | `Bent_Over_Barbell_Row` | |
| d1b | Weighted pull-up | `Weighted_Pull_Ups` | |
| d1c, d3b | Rack chin | **none** | No upstream entry shows heels on a rack. `Inverted_Row` is a different lift. Expect cue-only unless you find one |
| d1d, d5a | Flat DB press | `Dumbbell_Bench_Press` | |
| d1e | Weighted dip | `Dips_-_Triceps_Version` | Unweighted in the photo; F1.1 apparatus clause. Your call |
| d1f, d3f | Seated DB shoulder press | `Seated_Dumbbell_Press` | |
| d1g | Cambered bar curl | `EZ-Bar_Curl` | |
| d1h, d5i | Skull crusher | `EZ-Bar_Skullcrusher` | Cue says "to the forehead" — check the end frame |
| d2a, d4a | Squat | `Barbell_Squat` | |
| d2b, d4b | Hack squat | `Hack_Squat` | machine, not `Barbell_Hack_Squat` |
| d2c, d4d | Leg extension | `Leg_Extensions` | |
| d2d | Stiff-leg deadlift | `Stiff-Legged_Barbell_Deadlift` | Must be distinguishable from d4e in the photo, or one of them goes |
| d2e, d4f | Lying leg curl | `Lying_Leg_Curls` | |
| d2f | Standing calf raise | `Standing_Calf_Raises` | |
| d2g, d4i | Seated calf raise | `Seated_Calf_Raise` | The variant the SVG could not show |
| d3c | Seated cable row | `Seated_Cable_Rows` | |
| d3d | DB row | `One-Arm_Dumbbell_Row` | Stays cue-only if B-65 reverts to shrug |
| d3e | Close-grip pulldown | `Close-Grip_Front_Lat_Pulldown` | |
| d3g | Upright row | `Upright_Barbell_Row` | |
| d3h | Lateral raise | `Side_Lateral_Raise` | |
| d4c | Leg press | `Leg_Press` | The slot the SVG could not draw |
| d4e | Romanian deadlift | `Romanian_Deadlift` | See d2d |
| d4g | Seated leg curl | `Seated_Leg_Curl` | The slot §12.3 dropped for the wrong arrow |
| d4h | Donkey calf raise | `Donkey_Calf_Raises` | F1.3 dependency — reaffirm or release |
| d5b | Incline DB press | `Incline_Dumbbell_Press` | F1.3 dependency — reaffirm or release |
| d5c | Machine chest press | `Machine_Bench_Press` or `Leverage_Chest_Press` | The slot §12.3 dropped. Pick the one that shows a seat and handles |
| d5d | Incline cable fly | `Incline_Cable_Flye` | |
| d5e | Cambered bar preacher curl | `Preacher_Curl` | Photo may show a straight bar; F1.1 apparatus clause |
| d5f | DB concentration curl | `Concentration_Curls` | |
| d5g | Spider curl | `Spider_Curl` | |
| d5h | Close-grip bench | `Close-Grip_Barbell_Bench_Press` | |
| d5j | Rope pressdown | `Triceps_Pushdown_-_Rope_Attachment` | The cue needs the rope in frame |

**How to look at them.** The index and every candidate pair are one `curl` away (§0.3). Ask the main
session to fetch the pairs into the scratchpad and read them as images; do not rule from the name.

**Out of scope.** Cue changes (Q1 is closed), code, the layout, the licence.

**Acceptance criteria.**
- One table, 42 rows, each `id` or `none`, each with a one-line reason and a confidence tag, written
  as addendum **§13** in `docs/coach-audit-addendum.md`.
- Every `id` given exists in `dist/exercises.json` at the pinned SHA (W3 fails loudly otherwise).
- Every slot pair that shares a cue (the ten pairs in §10.2) shares a photo id or is split with a
  stated reason.
- The two F1.3 cue dependencies are each explicitly kept or released.
- The `d2e` / `d3d` contingencies (§12.3) restated for photos in one line each.
- **A slot the coach cannot see a pair for is `none`.** No "close enough".

**Depends on:** —

### W2 · §11 rewritten for photographs — owner: `ux-designer`

**Scope.** Replace `docs/specs/wo-004-screens.md` §11 (§11.1–§11.8) with a photograph standard.
Keep: §11.1 (what a figure is for), §11.2's "no text in the frame", §11.8's human tests where they
still apply (1, 2, 4, 6), and the F1 fallback (cue alone, no box, no placeholder). Delete: the
ghost/solid/arrow convention, the stroke and occupancy rules, §11.6's SVG-only rule. Add:

- **Layout at 400 px and at 200 % text.** Two photographs, start then end, left to right, in one row
  under the disclosure; the cue below them. Each image ≤ 50 % of the content width, aspect preserved,
  no crop. At 200 % text the pair may wrap to two rows; nothing clips.
- **Accessibility ruling.** Today the figure is `aria-hidden` and the cue is the accessible carrier
  (§11.6). Decide whether a photograph stays decorative. PM's recommendation, to be ruled not
  assumed: **decorative** — `alt=""` on both images, wrapper `aria-hidden="true"` — because the cue is
  the instruction and "Barbell squat, bottom position" beside "Barbell squat" and the cue is a third
  description of one thing. If you rule otherwise, supply the `alt` pattern per slot.
- **Dark ground.** The photos are white-background studio shots on a `#1c1b1a` surface. Rule the
  treatment (a 1 px `--line` border, a small radius, no filter that alters the movement) so a bright
  rectangle does not blow out the card mid-set. No hex outside `:root`.
- **The missing-image state.** Offline with a photo the cache never received: the `<img>` must render
  **nothing** — no broken-image glyph, no alt text box — and the cue must still render. State it.
- **Human tests for photos**, replacing §11.8 3/5/7: with the cue covered, a person who knows the lift
  names it; a person who does not can copy the end frame; `d2d` beside `d4e` and `d2e` beside `d4g` are
  distinguishable.

**Out of scope.** Choosing photos (W1). Code.

**Acceptance criteria.**
- §11 reads as one standard with no reference to strokes, arrows, ghost or solid poses, or inline SVG.
- The a11y ruling is stated with its reason and the `alt` value is literal.
- Every state is specified: both / cue-only / image missing offline / 200 % / 400 px.
- §11 names the F1 rule and the addendum §17 table as the only source of the map.

**Depends on:** — (parallel with W1)

### W3 · Asset pipeline, precache, deploy enumeration, licence — owner: `release-engineer`

**Scope.**
- `scripts/make-photos.mjs` (developer tool, Node + the Playwright already at
  `C:/Users/Chady/AppData/Roaming/npm/node_modules/playwright`; **no npm install**): reads
  `assets/ex/map.json` (W4 writes it from the coach's table — or W3 writes it from §13 directly, agree
  at dispatch), downloads `0.jpg` and `1.jpg` for every distinct id from the **pinned SHA**, resizes to
  **max 320 px wide** (aspect preserved) via a canvas in headless Chromium, encodes JPEG at a quality
  that lands the set under **1.5 MB total**, writes `assets/ex/<id>-0.jpg` and `<id>-1.jpg`, and
  regenerates `assets/ex/manifest.json` — `{sha, licence, files:[{path, bytes, sha256}]}`.
  Idempotent: running it twice produces byte-identical files.
- `assets/ex/LICENSE.md`: the upstream Unlicense text verbatim, plus one line naming the repo, the
  SHA and the date. `assets/ex/SOURCES.md`: per file, its upstream path.
- `sw.js`: photos join **OPTIONAL** (a missing photo must never fail the install — the cue survives
  alone), as a generated `PHOTOS` array with a "GENERATED by scripts/make-photos.mjs" header;
  `usable()` gains `.jpg`/`.jpeg` → `image/`; **VERSION → `v5`** (file list changed — the header rule).
  Confirm or add: an OPTIONAL entry absent from the cache is fetched on the next launch's refresh, so a
  photo dropped by a dead connection during install arrives on a later launch rather than never.
- `scripts/verify-deploy.sh`: photos are **hard failures** (200 + `image/jpeg` + byte length), listed
  from `assets/ex/manifest.json` — not typed by hand — and the script asserts that the manifest count,
  the `sw.js` `PHOTOS` count and the `assets/ex/*.jpg` count on disk agree before it fetches anything.
- `docs/deploy.md`: the table becomes "eleven files plus the photo set", with the count stated once
  and the rule that the manifest is the list. The upload loop reads the manifest.
- `scripts/offline-check.mjs`: `TYPES` gains `.jpg: image/jpeg`; the run additionally asserts, on the
  cold offline reload, that every mapped slot's two `<img>` elements have `naturalWidth > 0`, and
  reports the count.

**Out of scope.** Choosing photos, the layout, `index.html`.

**Acceptance criteria.**
- `assets/ex/` holds exactly `2 × (distinct ids in §13)` JPEGs, none wider than 320 px, total bytes
  reported and **≤ 1.5 MB**.
- `LICENSE.md` and `SOURCES.md` committed beside them; the SHA in both matches `manifest.json`.
- `sw.js` `v5`; `PHOTOS` length equals the manifest count; `usable()` rejects a `.jpg` served as
  `text/html`.
- `sh scripts/verify-deploy.sh` against a preview passes at **11 + N** with every photo byte-identical,
  and fails with a named path when one photo is removed from the extract.
- `node scripts/offline-check.mjs` PASS with the photos served from cache on a cold offline reload
  and the `naturalWidth` count equal to `2 × mapped slots`.
- No file outside `assets/ex/`, `sw.js`, `scripts/`, `docs/deploy.md` is touched.

**Depends on:** W1 (the id list). The script and the `sw.js`/verifier changes can be built against
the PM's draft map and re-run on the coach's table.

### W4 · `fig` on the plan document — owner: `backend-engineer`

**Scope.** Add `fig: "<upstream id>"` to each mapped slot in `PHAT_PLAN` (`logic.js`), transcribed
from addendum §17 — from the coach's table, not from this work order (the B-55 lesson). Unmapped
slots carry no `fig` key. `validatePlan`: `fig`, if present, must be a non-empty string matching
`/^[A-Za-z0-9_\-]+$/`; anything else is a `type` problem. Export `PHAT.figFor(id)` → the shipped
plan's `fig` for that id or `""`, reading `PHAT_PLAN` only (never a stored copy), pure. Write
`assets/ex/map.json` (`{slotId: figId}`) from the same table so W3's script and `PHAT_PLAN` cannot
disagree, and a test that pins them equal is W6's.

**Out of scope.** Any store, any migration, any engine. `SCHEMA_VERSION` stays 4.

**Acceptance criteria.**
- `PHAT.figFor("d2a")` returns the coach's id; `PHAT.figFor("d1c")` returns `""` (or whichever slots
  §13 leaves `none`); `PHAT.figFor("nonsense")` returns `""`.
- The ten shared-cue pairs return equal `fig` values unless §13 split them.
- `validatePlan` accepts a plan with no `fig` keys, accepts a copy that carries them, and rejects
  `fig: 3` naming the field.
- A v4 store boots with zero writes; `tests.html` migration assertions unchanged.
- Suite count moves only by the tests added; zero red.

**Depends on:** W1.

### W5 · `figBody()` renders photographs; the SVG code is deleted — owner: `frontend-engineer`

**Scope.** In `index.html`: delete `POSES`, `PAT`, `diagram()`, `limb()`, `figSeq` and the `svg.mv`
CSS, with a comment at the site stating why (three rounds of unclear figures; the constraint that
made them unclear — ≤ 12 strokes at 64 px — cannot show a machine's seat, pad and handles, which is
where every F1 drop happened). `hasFig(id)` becomes `!!(PHAT.figFor(id) && shippedName(id))`.
`figBody(id)` renders, per W2's spec, two `<img>` for `assets/ex/<fig>-0.jpg` / `-1.jpg` with W2's
`alt`/`aria-hidden` ruling, `loading="lazy"`, `decoding="async"`, `width`/`height` attributes so the
row does not reflow when the bytes land (the "nothing resizes above an input" ruling), and an
`onerror` that removes the image node — never a broken-image glyph. Then the cue, unchanged. Layout per
W2 at 400 px and 200 %.

**Out of scope.** The map, the cues, `sw.js`, any store.

**Acceptance criteria.**
- `grep -c "POSES\|PAT\b\|diagram(\|limb(" index.html` is 0 apart from the retirement comment.
- Every mapped slot's disclosure shows two photographs and its cue; every unmapped slot shows the cue
  alone with no box, border or placeholder; a slot with neither renders no disclosure (unchanged).
- With the network cut and one photo evicted from the cache by hand, the disclosure shows the other
  photo and the cue, and no broken-image glyph.
- Opening the disclosure moves no input on the card (the images carry explicit dimensions).
- At 400 px: both images fit in one row, neither wider than 50 % of the content width. At 200 % text:
  nothing clips; the cue is ≤ 2 lines.
- A renamed shipped slot (`shippedName` false) shows no photo and no cue — unchanged behaviour.
- No new colour literal; the border, if W2 rules one, uses a `:root` token.
- Suite: zero red.

**Depends on:** W2, W3 (files on disk), W4 (`PHAT.figFor`).

### W6 · QA — owner: `qa-engineer`

**Scope.** Verify W1–W5 and the password lane's W7–W8. Automated where `file://` allows, Playwright
where it does not, by hand where only a phone can answer (add to the checklist with evidence).

**Acceptance criteria.**
- `tests.html`: pins `PHAT.figFor` per §13 (the full table, so a silent edit fails); pins that every
  `fig` id appears in `assets/ex/map.json` **and** vice versa (embed the map as a fixture and assert
  equality with `PHAT_PLAN`'s `fig` set); pins the shared-cue pairs; pins the F1.3 dependencies the
  coach kept, or records their release; **zero red**, expected count stated in the file.
- Playwright, `offline-check.mjs` extended by W3: on a cold offline reload every mapped slot renders
  two images with `naturalWidth > 0`, every unmapped slot renders the cue alone, the precache
  installs with **zero 404s** (assert the cache holds `11 + N` entries minus `tests.html`).
- Data: with three sets typed in a draft, open a disclosure, reload offline — the draft is offered
  back with all three sets intact; `phat:v1:*` keys byte-identical before and after this branch's boot
  (assert from a v4 store fixture).
- Deploy: `verify-deploy.sh` at `11 + N` on the preview, every photo byte-identical.
- Measured at 400 px on the shipped face: `.showfig` ≥ 44 px; the two images inside the content box.
- Manual checklist gains one phone item: the pair reads on the gym floor at arm's length.
- Password lane: criteria in W7/W8, verified against the **live** project with a throwaway account
  (see §2 and §5).

**Depends on:** W5, W8.

### W7 · Release — owner: `release-engineer`

**Scope.** Merge `wo-009-photos` when W6 passes, deploy **all 11 + N files** from a pinned extract,
verify with `verify-deploy.sh` against production, confirm `sw.js` `v5` live, run `offline-check.mjs`
against the production origin, close in `docs/backlog.md` and `docs/decisions.md`.

**Acceptance criteria.**
- Production `verify-deploy.sh` exit 0 at `11 + N`; the exact N recorded in the decisions entry.
- Live `sw.js` reports `v5`; a phone that had `v4` receives the photos on its second launch.
- `/assets/ex/LICENSE.md` is **not** required to be served; it is required to be in the repo.

**Depends on:** W6.

---

## 2. Work order — Lane B, `Change password` (branch `wo-009-password`)

Diana's password was generated for her; `supabase/README.md` §2.1 says "there is no in-app reset".
This is the signed-in half of that: a user who can sign in can set her own.

### W8 · `changePassword` in `sync.js` — owner: `backend-engineer`

**Scope.** `changePassword(newPassword)` on the `PHAT_SYNC` surface: refuses when signed out
(`{ok:false, reason:"auth", message:"Sign in first."}`), refuses when `st.busy` (existing sentence),
calls `client.auth.updateUser({ password })` through `runAuth`-style busy handling, and returns
`{ok:true}` or `{ok:false, message}` via `authMessage`. `authMessage` gains the Supabase strings this
call can return: same-as-old (`New password should be different` → `That is already your password.`),
weak (existing `Password needs at least 6 characters.`), and — if the project's **Secure password
change** setting is on — the reauthentication error, mapped to `Sign out and sign in again, then
retry.` Confirm from the dashboard whether that setting is on and record it in `supabase/README.md`.
`onAuthStateChange` must treat the `USER_UPDATED` event as **not** a user change: `S.sync.last` is not
wiped, no push is scheduled, no route fires.

**Out of scope.** Password reset by email (there is no in-app path and none is being built), sign-up
changes, any store.

**Acceptance criteria.**
- Signed out: `changePassword("x")` returns `ok:false` with `Sign in first.` and makes **no** network
  call (assert with the fetch stub).
- Offline and signed in: returns `ok:false`, `No connection.` (existing mapping).
- `USER_UPDATED` from the library changes neither `st.user.id` nor `S.sync.last`, and schedules no
  backup (rig assertion, same shape as WO-008's).
- `sync.js` exports the function on `PHAT_SYNC` and in the named exports; `lib` pin unchanged.

**Depends on:** —

### W9 · The Settings control — owner: `frontend-engineer`

**Scope.** In `vBackupBody()`'s **signed-in** branch only: a `Change password` disclosure or block
after `Sign out`, with `New password` (`type="password"`, `autocomplete="new-password"`) and
`New password again`, a `Change password` button, and a status line in the existing `#bk-status`
pattern. Client-side: both fields filled, equal, ≥ 6 characters, else a refusal naming the problem
(`Passwords do not match.` / existing `Password needs at least 6 characters.`) with no call made.
Success: `Password changed.` in the advice pattern, fields cleared, announced through `#bs-live`.
Failure: the module's message in the refusal pattern, fields **kept**. Disabled while `busy`. House
voice: imperative, no exclamation, no emoji. All three controls ≥ 44 px.

**Out of scope.** The signed-out form, first-run screen B, any copy about email reset.

**Acceptance criteria.**
- The control does not exist in the DOM when signed out or while the module is not `ready`.
- Mismatched fields: refusal visible, no network call. 5-character password: refusal, no call.
- Success and failure are each visible on screen **and** announced; the phone-lock case (backgrounded
  mid-call) resolves to one of the two, never a spinner forever.
- Measured at 400 px: inputs and button ≥ 44 px tall, full-width, no control in the top corners.
- Nothing in the session, draft or log path is touched; the suite's zero-`phat:*`-writes meta-test
  still passes.

**Depends on:** W8.

### QA for Lane B (inside W6)

- Against the **live** project with a throwaway account (or the account Chady supplies, §5): change
  the password; sign out; sign in with the new one → `Signed in.`; with the old one → `Wrong email or
  password.`; entry logged before the change is still on the device byte for byte.
- The throwaway is deleted from the dashboard afterwards by Chady (B-98: no self-delete path), or
  its email and the fact that it exists are written into the decisions entry.

### Release for Lane B (release-engineer, may precede W7)

Merge `wo-009-password` on its own QA pass; deploy the eleven files; **`sw.js` stays `v4`** by the
header rule if it ships before Lane A (file list unchanged), or rides `v5` if after. Verify live.

---

## 3. Sequence

```
W1 coach (map)  ∥  W2 ux (§11 rewrite)  ∥  W8 backend (changePassword)
      │                    │                       │
      ├──> W3 release (pipeline, sw.js v5, verifier, licence)   [can start on the draft map, re-run on §13]
      ├──> W4 backend (fig on PHAT_PLAN, figFor, map.json)       │
      │                    │                                    W9 frontend (Settings control)
      └────────────────────┴──> W5 frontend (figBody, delete SVG) │
                                        │                         │
                                        └──────> W6 QA <──────────┘
                                                   │
                                                   └──> W7 release (Lane A)   [Lane B may release separately, earlier]
```

- **W1, W2, W8 run in parallel now.** None depends on another.
- **W3 and W4 start after W1** — both transcribe the coach's table. W3 may build its script against the
  PM's draft and re-run it on §13; W4 must not.
- **W5 needs all of W2, W3, W4.**
- **W9 after W8.**
- **W6 last; W7 after W6.** Lane B may go through QA and release on its own if it is ready first — it
  is a nine-line module change and one Settings block, and Diana is waiting on it.

## 4. Risks

| Risk | Handling |
|---|---|
| **Licence.** Unlicense verified from the file and the API at the pinned SHA. The photographs are the repository's own; if a later inspection finds an image that is not the repository's to release, that image is removed and the slot goes cue-only. `SOURCES.md` makes each file traceable | W3 |
| **A photo of the wrong variation ships as "close enough."** F1 forbids it. The process that stops it: the coach reviews the pair as images, per slot, and writes `none` where unsure; W4 transcribes from §13, never from this order; QA pins the full table so a later "tidy-up" cannot remap a slot silently; the human test in W2 is run on the phone by Chady before close and recorded on the checklist | W1, W4, W6 |
| **The deploy list outgrows a human.** 11 + ~62. Mitigation is structural: one manifest generates the `sw.js` array and drives the verifier and the upload loop, and the verifier refuses to run if the three counts disagree | W3 |
| **First install over mobile data.** ~1.0–1.3 MB once, ceiling 1.5 MB. Photos are OPTIONAL in `sw.js`, fetched after CORE inside their own `catch`, so a dropped connection costs photos, not the app; the next launch's refresh fills the gaps. He agreed to the size | W3 |
| **A photo missing offline shows a broken-image glyph** — the one visible failure mode of `<img>` that SVG never had | W5 `onerror` + W2's specified state + W6's eviction test |
| **The white-background photo blows out the dark card** mid-set | W2 rules the treatment |
| **`sw.js` `usable()` has no rule for `.jpg`** today, so a `text/html` 404 page served with 200 (a misrouted origin) would have been cached as a photo. Filed **B-103**; closed in W3 | W3 |
| **Stored plan copies.** None need touching: `fig` is read from the shipped plan by id, unknown keys survive `copyPlan` and `validatePlan`. No migration, no version move | W4 asserts |
| **`USER_UPDATED` mishandled** as a user change, wiping `S.sync.last` or scheduling a push on a password change | W8 criterion |
| **Secure password change** may be on in the Supabase project, in which case `updateUser` needs reauthentication and the control cannot work as specified | W8 checks the dashboard first and reports; if on, the copy is `Sign out and sign in again, then retry.` and Chady decides whether to turn it off |
| **Sign-ups may already be locked** (README §2.1) by the time QA needs a throwaway | §5 |
| **Regression surface.** `figBody()` and the disclosure handler are the only session-screen code touched; the set rows and `save()` path are not. QA's draft-survives-reload criterion is the guard | W6 |

## 5. Needs from Chady

1. **Look at the pairs once before close.** W2's human test needs the person the app is for: open
   two or three disclosures on the phone at arm's length and say whether they read. Two minutes.
2. **QA account for the password test.** If both sign-ups are done and the lock is on, either supply a
   test account, or re-open sign-ups for the duration of W6 and re-lock after (README §2.1 step 2
   says how). If the lock is not yet on, QA creates and names a throwaway and you delete it from the
   dashboard afterwards.
3. **Secure password change** in the Supabase dashboard: if W8 reports it is on, say whether to turn it
   off. Recommendation: off — one user, no shared devices, and the alternative is a sign-out round trip
   that a generated-password user will not understand.
4. **B-65** is still yours: `DB row` or `Shrug` for `d3d`. The photo mapping for that slot follows the
   answer; the default stays `DB row`.

## 6. Backlog items filed by this order

| ID | Item | Sev |
|---|---|---|
| B-101 | The movement figures are unclear for the third time; the SVG approach is retired and photographs from `free-exercise-db` replace it (this order, Lane A) | P2 |
| B-102 | No way for a signed-in user to change a password that was generated for her (this order, Lane B) | P2 |
| B-103 | `sw.js` `usable()` and `scripts/offline-check.mjs` `TYPES` have no rule for `.jpg`; a misrouted 200 with the wrong content-type would be cached as a photo | P3 → W3 |
| B-104 | The deploy enumeration is hand-kept in three places; at 11 + ~62 it must be generated from one manifest and cross-checked by script | P3 → W3 |
| B-105 | `d1c`/`d3b` Rack chin has no source photograph; cue-only until one exists. A phone photo of his own rack chin, cropped to the same frame, is the cheapest fill and needs no licence | P3, open |

B-60 and B-64 close as **superseded** on W5's merge; B-15 closes as **moot** (no SVG rendered).
