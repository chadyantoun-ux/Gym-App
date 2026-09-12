# Deploying PHAT Log

Project `gym-app` · production `https://gym-app-psi-eight.vercel.app` · repo
`https://github.com/chadyantoun-ux/Gym-App`.

**Read §1 before anything else.** One fact in it is the cause of every deploy failure this project
has had, and it is not obvious.

---

## 0. The state this document exists for

The **Vercel GitHub App is not installed** on `chadyantoun-ux/Gym-App`, so a push to `main` deploys
nothing. Until it is, every release is a manual call to the Vercel REST API from this machine
(`gh`, `vercel` and `supabase` CLIs are not installed; `git`, `curl` and Node are).

Installing the GitHub App deletes this whole procedure and is a two-minute job in Chady's browser —
see §7. **That is the recommended fix, and this document is the workaround.**

---

## 1. The one thing that goes wrong

**A Vercel deployment is a complete, immutable snapshot of a site — not a patch.**

Whatever you put in the `files` array *is* the site. A file you leave out does not keep its old
version; it **ceases to exist** at that deployment. So "I only changed `sw.js`, I'll just upload
`sw.js`" produces a production site consisting of exactly one file, and `index.html` 404s.

That is the black screen this project keeps rediscovering. **Every deploy uploads every file.**

---

## 2. The file list — it is ELEVEN, plus the photo set

**Eleven files, plus the photo set (48).** E-3 added `sync.js` on 2026-09-11; WO-009 W3 added the
exercise photographs under `assets/ex/` on 2026-09-12. `docs/work-orders/WO-005-overnight.md` still
says six and is stale. This table, `assets/ex/manifest.json` and `scripts/verify-deploy.sh` are the
authority — and they are checked against each other by script, not by eye (see the photo set below).

Seven core files plus four icons, then the photographs. Upload them in this order; the order does not
matter to Vercel, but keeping one order means a half-finished upload is obvious in the terminal.

**The four icons are not optional, and "it's only an icon" is the wrong instinct.**
`manifest.webmanifest` names every one of them by path. A 404 on an icon is not a cosmetic miss:

- the browser has no icon to install with, so the home-screen entry is degraded or refused
  outright — which is the entire point of E-4, turning a bookmark into an app;
- `sw.js` refuses to commit a cache entry for a non-200, so a missing icon **fails the service
  worker install**, and a failed install means no offline shell — the gym has no signal, so that is
  a release-blocking failure, not a blemish;
- `verify-deploy.sh` therefore checks them as hard failures, not warnings, and cross-checks that
  every `src` in the manifest is one it verifies.

| # | Path | Content-type Vercel serves | Why it is load-bearing |
|---|---|---|---|
| 1 | `index.html` | `text/html` | The app |
| 2 | `logic.js` | `application/javascript` | The app does not run without it. `index.html` has a guard that says so in words rather than showing a black screen |
| 3 | `tests.html` | `text/html` | The QA harness, deployed deliberately so the manual checklist can be run from the phone |
| 4 | `assets/archivo-inline.css` | `text/css` | The typeface. Missing = fallback stack, and every 44 px measurement was taken against Archivo |
| 5 | `manifest.webmanifest` | `application/json` | No manifest, no install prompt, no PWA |
| 6 | `sw.js` | `application/javascript` | Offline. Missing = the gym has no app |
| 7 | `sync.js` | `application/javascript` | E-3, the backup client: an ES module `index.html` injects after boot. Missing = Settings says `Backup could not load` and nothing else changes; but `sw.js` precaches it, and a 404 is a file that is never cached |
| 8 | `assets/icon-192.png` | `image/png` | Named by the manifest |
| 9 | `assets/icon-512.png` | `image/png` | Named by the manifest |
| 10 | `assets/icon-maskable-512.png` | `image/png` | Named by the manifest |
| 11 | `assets/apple-touch-icon-180.png` | `image/png` | Named by `sw.js`'s precache list; iOS home screen |

**The photo set — 48 files, listed nowhere by hand.** WO-009 replaced the stick figures with
photographs: `assets/ex/<id>-0.jpg` (start of the rep) and `<id>-1.jpg` (end) for each exercise the
coach passed by eye (`docs/coach-audit-addendum.md` §17.2/§17.8). Today that is **24 exercises,
48 JPEGs, 740,232 bytes**, 320 px wide. They are precached by `sw.js` as `PHOTOS` and served as
`image/jpeg`. A missing photo is not a black screen — `sw.js` treats them as optional at install and
the slot shows its cue alone — but it **is** a silent, permanent degradation for the life of that
deployment, so the verifier checks every one as a hard failure.

**The rule: `assets/ex/manifest.json` is the list.** It is written by `scripts/make-photos.mjs` from
`assets/ex/map.json` (the coach's table), and the same run regenerates the `PHOTOS` block in `sw.js`.
Nobody types a photo path into `sw.js`, this document, the verifier or the upload loop:

- **`sw.js`** reads the manifest at generation time (the block between the `GENERATED` markers).
- **`scripts/verify-deploy.sh`** reads the manifest at run time, and **refuses to run (exit 2)** when
  the manifest's `count`, its rows, the `sw.js` `PHOTOS` array and `assets/ex/*.jpg` on disk are not
  the same set, or when a row's `bytes` differs from the file — a stale manifest.
- **The upload loop in §4.1/§4.3** reads the manifest for the photo paths, and `$OK` must equal
  `11 + N` where `N` is the manifest's `count`.
- **`scripts/offline-check.mjs`** reads the manifest and asserts all `N` decode offline from the cache.

If any of those four disagree, the fix is one command — `"/c/Program Files/nodejs/node.exe"
scripts/make-photos.mjs` — and one commit that carries `assets/ex/` and `sw.js` together.

`assets/ex/map.json`, `manifest.json`, `LICENSE.md` and `SOURCES.md` are **in the repo and not
uploaded**: the app never fetches them (the files on disk are already in start/end order, so the
frontend needs no table). The manifest is copied into the deploy extract only so the verifier and the
upload loop can read it there.

Nothing else. No `docs/`, no `scripts/`, no `.snapshots/`, no `CLAUDE.md`. There is **no
`vercel.json`** and there must not be one with a build command in it — static files, no framework,
no build step (CLAUDE.md §3.1).

The authoritative copy of the **eleven** lives in **two** places that must agree:
`scripts/verify-deploy.sh` (`CORE_FILES` + `ICON_FILES`) and this table. Change one, change the
other, in the same commit. The **photo set** has one authority, the manifest, and the script checks
the rest.

---

## 3. The token

The Vercel token lives **in the shell for the length of one deploy and nowhere else.**

```sh
read -rs VERCEL_TOKEN && export VERCEL_TOKEN      # -s: not echoed, not in scrollback
```

- **Never** write it into a file in this repo, a commit message, a doc, or agent output.
- **Never** `echo "$VERCEL_TOKEN"`, and never paste it into a chat. The current token already was;
  it is compromised and **must be rotated** (Vercel → Account Settings → Tokens → delete, create).
- `.env*` is gitignored, but a gitignored file is not a safe place for it either. The shell is.
- Pre-flight, before any upload, prove nothing secret is going out:

```sh
grep -rInE 'eyJ[A-Za-z0-9_-]{10,}|service_role|VERCEL_TOKEN|sk_live|SUPABASE_.*KEY' \
  index.html logic.js tests.html sw.js sync.js manifest.webmanifest assets/archivo-inline.css \
  assets/ex/manifest.json assets/ex/SOURCES.md \
  && echo "STOP: something credential-shaped is in a file about to be deployed"
```

Today the correct result is no matches: the Supabase **publishable** key in `sync.js`
(`sb_publishable_…`) is designed to be public, is behind RLS on every table (verified 2026-09-11),
and is not `eyJ`-shaped, so the grep passes over it by design. The **`service_role`** key never
appears anywhere except Vercel's environment variables. There are no Vercel env vars set on this
project today and none are needed: the browser talks to Supabase directly.

---

## 4. The deploy

### 4.0 Preview first. Always.

**Deploy a preview, verify it, then deploy production.** A preview is the same API call with the
`target` key **omitted**; it gets its own URL and touches nothing that is live. The cost is one
extra minute. The thing it buys is that production is never the place you discover a bad recipe.

Setting `"target":"production"` is the *only* thing that makes a deploy production. Omit the key
and you cannot hurt the live site, whatever else goes wrong.

Exercised on 2026-09-11 against `verify-deploy.sh`: §4.1–4.2 and the body-construction half of
§4.3–4.4 were run end to end and three defects were found and are corrected below. **The
authenticated calls — `POST /v2/files` and `POST /v13/deployments` — remain UNEXECUTED**, because
no Vercel token was available in that session. See §9 for exactly what is still unproven.

### 4.1 Pre-flight — and how to deploy safely while other agents are editing

The old instruction here was "`git status --short` must be empty. Never deploy an uncommitted
tree." **That is not achievable in this repo** and pretending otherwise is how a release gets
blocked or, worse, ships someone's half-written file. Several agents share one working tree and
there is almost always something in flight (CLAUDE.md §4b).

So do not deploy the working tree, and **do not `git stash`, `git checkout` or `git clean`** — each
of those mutates the tree other agents are working in and can destroy unfinished work.

Deploy from an **extract of one pinned commit**, in a temp directory outside the repo:

```sh
REPO="/c/Users/Chady/Desktop/Phat Gym Track"

# Pin the SHA ONCE. Do not write "HEAD" again after this line.
SHA=$(git -C "$REPO" rev-parse HEAD)
BRANCH=$(git -C "$REPO" rev-parse --abbrev-ref HEAD)
echo "$SHA on $BRANCH"          # record this; it goes in the deploy meta and the report

TREE=$(mktemp -d)
ELEVEN="index.html logic.js tests.html assets/archivo-inline.css manifest.webmanifest sw.js sync.js \
assets/icon-192.png assets/icon-512.png assets/icon-maskable-512.png assets/apple-touch-icon-180.png"

# The photo list comes from the manifest AT THE PINNED SHA - never from the
# working tree, never typed. The manifest itself goes into the extract (the
# verifier and the loop below read it there) but is NOT uploaded.
mkdir -p "$TREE/assets/ex"
git -C "$REPO" cat-file blob "$SHA:assets/ex/manifest.json" > "$TREE/assets/ex/manifest.json" \
  || { echo "MISSING IN COMMIT: assets/ex/manifest.json"; }
PHOTOS=$(grep '"path":"assets/ex/' "$TREE/assets/ex/manifest.json" | sed 's/.*"path":"\([^"]*\)".*/\1/')
N=$(printf '%s\n' $PHOTOS | grep -c .)
WANT=$((11 + N))
FILES="$ELEVEN $PHOTOS"
echo "eleven + $N photographs = $WANT files"

for f in $FILES; do
  mkdir -p "$TREE/$(dirname "$f")"
  git -C "$REPO" cat-file blob "$SHA:$f" > "$TREE/$f" || { echo "MISSING IN COMMIT: $f"; break; }
done
ls -lR "$TREE"
[ "$(ls "$TREE"/assets/ex/*.jpg | wc -l)" -eq "$N" ] || echo "STOP: extract holds $(ls "$TREE"/assets/ex/*.jpg | wc -l) photos, manifest says $N"
```

> **The photographs are binary and `git cat-file blob` is exactly right for them.** `core.autocrlf`
> cannot touch a JPEG (git detects the NUL bytes and never converts), so the extract is byte-identical
> whichever way it is made. `.gitattributes` marks `*.png binary`; it does not yet say `*.jpg` — belt
> and braces would be one line, and it is outside W3's file list, so it is noted here rather than done.

Then the credential grep from §3, run against `$TREE`, not the repo.

> **Why the SHA is pinned, and it is not theoretical.** During the 2026-09-11 dry run `HEAD` moved
> **twice in ten minutes** (`5ecf1dc` → `8bb7668` → `47cf307`) as other agents committed. Two
> `git rev-parse HEAD` calls minutes apart returned different commits, so a recipe that re-evaluates
> `HEAD` can upload `logic.js` from one commit and `index.html` from the next. That is a black
> screen assembled out of two individually-correct files. Resolve once, reuse `$SHA` everywhere.

> **Why `git cat-file blob` and NOT `git archive`.** `core.autocrlf` is `true` on this machine, and
> `git archive` applies it: it rewrote LF to CRLF and inflated `tests.html` from 527,241 to
> **535,996 bytes** (+8,755, one per line), `sw.js` by 267, `manifest.webmanifest` by 34.
> `git cat-file blob` emits the committed bytes verbatim. Measured, not assumed. The PNGs are safe
> either way — `.gitattributes` marks `*.png binary` and all four came out byte-identical.
> If you prefer a single command, `git -c core.autocrlf=false archive "$SHA" | tar -x -C "$TREE"`
> also produces the correct bytes; the bare `git archive` does not.

### 4.2 Record the deployment you are about to replace — **do this before uploading**

Rollback needs a target id, and the easiest moment to lose it is after a bad deploy.

```sh
curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?app=gym-app&limit=5&target=production"
```

Copy the `uid` (looks like `dpl_...`) and `url` of the current **READY** production deployment into
your notes. That is the rollback target in §6.

> **Team scope — settle this FIRST, before any upload.** If any call returns
> `{"error":{"code":"forbidden"}}` the project is under a team, not your personal scope, and every
> call needs a team id. The old wording here said "append `&teamId=team_...` to every call below",
> which is **wrong for two of the three calls**: `POST /v2/files` and the deployment-status GET
> have no query string, so `&teamId=` produces a malformed URL like
> `https://api.vercel.com/v2/files&teamId=team_x`. Use one variable instead, set once, appended
> with a leading `?` so it is correct everywhere:
>
> ```sh
> curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" https://api.vercel.com/v2/teams
> TEAM=""                      # personal scope: leave empty
> # TEAM="?teamId=team_XXXX"   # team scope: uncomment and fill in
> ```
>
> Then every URL below is written `".../endpoint${TEAM}"`, and a call that already has a query
> string uses `"...?a=b${TEAM#?}"`. **Prove scope with a cheap read before uploading 900 KB**:
> `curl -sS -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $VERCEL_TOKEN"
> "https://api.vercel.com/v9/projects/gym-app${TEAM}"` — a `200` means this scope is right, a
> `403` means try the other one. **Unresolved as of 2026-09-11: which of the two applies.**

### 4.3 Upload the file bodies

Each file is uploaded once, addressed by its SHA-1. Vercel stores it and the deployment then
references it by digest — which is also why a typo in a digest is a missing file rather than a
corrupt one.

Run this **from `$TREE`** (the pinned extract from §4.1), never from the repo.

```sh
cd "$TREE"
WORK=$(mktemp -d); : > "$WORK/entries"; OK=0

for f in $FILES; do
  [ -f "$f" ] || { echo "MISSING LOCALLY: $f - stop, do not deploy"; break; }
  sha=$(sha1sum "$f" | cut -d' ' -f1)
  size=$(wc -c < "$f" | tr -d ' ')
  code=$(curl -sS -o "$WORK/resp" -w '%{http_code}' -X POST \
    "https://api.vercel.com/v2/files${TEAM}" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/octet-stream" \
    -H "x-vercel-digest: $sha" \
    -H "Content-Length: $size" \
    --data-binary "@$f")
  echo "$f  $size bytes  sha=$sha  HTTP $code"
  case "$code" in 200|201) ;; *) echo "UPLOAD FAILED: $f"; cat "$WORK/resp"; break ;; esac
  printf '{"file":"%s","sha":"%s","size":%s},' "$f" "$sha" "$size" >> "$WORK/entries"
  OK=$((OK+1))
done

# The loop uses `break`, which leaves a SHORT entries file and keeps going. Do
# not rely on reading the lines above. Make it refuse. $WANT is 11 + N from 4.1.
[ "$OK" -eq "$WANT" ] || echo "STOP: only $OK of $WANT uploaded. Do NOT run 4.4. Fix and re-run the whole loop."
```

**`$OK` must be `$WANT` (11 + N, 59 today) and every line must say HTTP 200 or 201 before
continuing.** If any line failed, fix it and re-run the whole loop. A partial upload here is harmless —
nothing is live until §4.4 — but a partial `entries` file is the black screen. The photographs are
`image/jpeg`; the `Content-Type: application/octet-stream` on the upload call is what Vercel's file
API expects for every body and says nothing about how the file is served — the served type comes
from the extension, and `verify-deploy.sh` checks it.

Dry-run 2026-09-11: the loop, with the curl stubbed out, produced all ten entries (eleven since E-3 added sync.js) with correct
sizes and digests, and the resulting JSON parsed clean. The `sha1sum | cut -d' ' -f1` idiom is safe
despite git-bash printing `sha *file` in binary mode. **The upload call itself is still unproven.**

### 4.4 Create the deployment

**Preview (do this one first, and by default):** omit `target` entirely.

```sh
{ printf '{"name":"gym-app","project":"gym-app",'
  printf '"projectSettings":{"framework":null,"buildCommand":null,"installCommand":null,'
  printf '"outputDirectory":null,"devCommand":null},'
  printf '"meta":{"commit":"%s","branch":"%s"},' "$SHA" "$BRANCH"
  printf '"files":[%s]}' "$(sed 's/,$//' "$WORK/entries")"
} > "$WORK/body.json"

# COUNT THE FILES. `grep -c` is WRONG here - see the note below.
grep -o '"file"' "$WORK/body.json" | wc -l      # must print $WANT (11 + N; 59 today)

curl -sS -X POST "https://api.vercel.com/v13/deployments?forceNew=1&skipAutoDetectionConfirmation=1${TEAM#?}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "@$WORK/body.json"
```

**Production:** identical, but with `"target":"production",` inserted after `"project":"gym-app",`.
Only do this after the preview has passed §5.

> **Two corrections, both found by running this on 2026-09-11.**
>
> **1. The file-count guard never worked.** This document said `grep -c '"file"' body.json` "must
> print 10". `grep -c` counts matching **lines**, and the body is built with `printf` with no
> newlines — it is a single line. So it prints **1**, always, on a perfectly good ten-file body.
> Measured: `wc -l` = 0, `grep -c` = 1, `grep -o '"file"' | wc -l` = 10. The one gate protecting
> against the partial `entries` file that §1 calls "the black screen" would have fired on every
> single deploy — which trains you to ignore it, or sends you debugging a healthy release at 5 a.m.
> Use `grep -o ... | wc -l`.
>
> **2. `meta` came out empty.** This document called `$(git rev-parse HEAD)` inline, but §4.3 runs
> from `$TREE`, which is an extract and **not a git repository**: the command prints
> `fatal: not a git repository` and substitutes an empty string, giving `"commit":"","branch":""`.
> Not fatal to the deploy, but it silently destroys the only record of which commit is live — the
> field you need most when something is wrong. Use the `$SHA` and `$BRANCH` pinned in §4.1.

`projectSettings` with every command `null` is what keeps this a static deploy. **Do not add a
framework preset or a build command** — CLAUDE.md §3.1, and a build step here is a defect, not a
convenience. *Unverified:* that all-null `projectSettings` in fact yields a build-free static
deployment has not been observed on this project; it is inference from the API docs (§9).

The response carries `id` (`dpl_...`), `url` (the preview hostname) and `readyState`. `$WORK` is a
temp directory outside the repo; it holds no token, but delete it anyway, along with the extract:
`rm -rf "$WORK" "$TREE"`.

### 4.5 Wait for READY

```sh
DPL=dpl_XXXX            # the id from 4.4's response
for i in $(seq 1 40); do
  s=$(curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" \
        "https://api.vercel.com/v13/deployments/${DPL}${TEAM}" \
      | tr ',' '\n' | grep -i 'readystate' | head -1)
  echo "$i $s"
  case "$s" in *READY*|*ERROR*|*CANCELED*) break ;; esac
  sleep 3
done
```

`QUEUED` → `BUILDING` → `READY`. With no build step this should take seconds. `ERROR` means stop
and read the full response; do not retry blindly.

The preview hostname is the `url` field of the same response (no scheme — prefix `https://`). That
string is the argument to §5. *Unverified:* the polling loop above has not been run against the
live API (§9); the shape of the response is taken from the API docs.

---

## 5. Verify — by fetching the bytes, never by reading a dashboard

**Verify against the same bytes you deployed.** The script compares the origin to a local
directory, and by default that directory is the working tree — which other agents are editing. If
you deployed the §4.1 extract, point `TREE` at it:

```sh
TREE="$TREE" COMMIT="$SHA" sh scripts/verify-deploy.sh https://<preview-host>.vercel.app
```

Only use the bare form when the working tree genuinely is what went out:

```sh
sh scripts/verify-deploy.sh
```

It first proves the photo list is one list — `assets/ex/manifest.json` rows, the `sw.js` `PHOTOS`
array and the JPEGs in the tree must be the same set with the same byte counts, or it **refuses to
run (exit 2)** and names the odd one out. Then it fetches all eleven files **and every photograph**
and fails unless each returns **200**, a content-type containing the expected token (`image/jpeg`
for the photos), a byte length equal to the local file, and bytes identical to the local file. It
then cross-checks that every icon named in `manifest.webmanifest` is one it verified. It exits
non-zero and names every failure. `PASS 59/59 ... (eleven + 48 photographs)` is the line to expect. It uses no token and no API — it is a stranger with `curl`,
which is exactly what his phone is.

A green dashboard with a 404 on `/logic.js` is a state this project has actually been in. **The
dashboard is not evidence. The bytes are.**

If a length mismatch reports **"IDENTICAL once CR is stripped"**, that is not a stale upload — it
is the CRLF trap from §4.1. Re-extract with `git cat-file blob`, or point `TREE` at what you
actually deployed. The script names this case specifically so it is never mistaken for a partial
upload.

**Verified on 2026-09-11:** against a stand-in origin serving the ten files from a pinned-commit
extract, `verify-deploy.sh` printed `PASS 10/10` and **exited 0**; against an origin serving
CRLF-converted bytes it exited 1 and named the line-ending cause on exactly the four affected files
while still reporting a genuinely different `logic.js` as a real mismatch. Against live production
it exited 1 and correctly reported three stale files and seven 404s. The verifier is proven; what
is not yet proven is the deployer that feeds it (§9).

If `verify-deploy.sh` fails on *any* file: **roll back now** (§6), then diagnose. Do not "just
re-upload the one that failed" — see §1.

### 5.1 Then the two things curl cannot answer

1. **The installed app updates.** On the phone: open the installed PWA, close it, open it again.
   `sw.js` refreshes the whole shell once per launch and commits nothing unless every core file
   returned a clean 200, so the new build lands on the **second** open. Worst-case staleness is one
   launch, by design.
2. **Offline still works.** Airplane mode, open the installed app, log a full session, kill the
   browser, reopen. This is a release requirement, not a feature.

### 5.2 When `sw.js`'s `VERSION` must be bumped

`sw.js` says it and it is right: **routine content deploys need no bump.** The per-launch refresh is
not gated on the version. Bump `VERSION` only when

- the **file list** in `CORE`/`OPTIONAL`/`PHOTOS` changes, or
- a cached entry must be actively discarded (a file was renamed or removed), or
- **a photograph changed bytes under the same path.** `PHOTOS` are filled in, never re-fetched:
  the per-launch refresh downloads a photo the cache lacks and leaves one it holds, because 48
  downloads over mobile data on every open is the wrong trade for files that change only when the
  coach changes the map. So a re-shot photo reaches an installed phone **only** through a bump.
  `scripts/make-photos.mjs` regenerates the `PHOTOS` block; it does **not** bump `VERSION` — that is
  a release decision, made by hand, in the same commit.

Bumping it needlessly forces every installed app to rebuild its shell from the network — which, for
someone standing in a gym with no signal, is the opposite of what this file is for.

---

## 6. Rollback

The recovery path, in order of preference. **Rollback is always cheaper than a fix-forward deploy at
2 a.m.**

**Rolling back across the photo set (v5 → a v4 deployment, or any deploy that drops a photo).** Safe,
and here is why, so nobody has to reason it out at 2 a.m. The installed `v5` worker refreshes
`CORE` (the old `index.html`/`logic.js` come back, as a pair or not at all), refreshes `OPTIONAL`,
then runs the photo gap-fill — every photo it already holds is left alone and every one the rolled-back
origin 404s is a caught failure, not an error. Nothing half-commits. The browser then sees the
byte-different `sw.js` (`v4`), installs it, and on activate `v4` deletes `phat-shell-v5` — photos
and all — leaving exactly the v4 shell. The rolled-back app never references a photo, so no slot is
ever left with a broken image. The cost is the 0.7 MB re-download if the photo set is re-released
later; there is no data cost, because no store is involved (CLAUDE.md §3.3 — the cache holds the
app, never the numbers).

**A rollback to a v5 deployment with a *different* photo set** (e.g. the coach fails a slot and its
two files are removed) is a **file-list change, so it needs its own `VERSION`** — otherwise phones
keep the removed photos in cache until the next bump. `verify-deploy.sh` exit 2 on the extract is the
signal that the manifest, `sw.js` and the files were not regenerated together.

### 6.1 Dashboard — instant, and the one to use under pressure

1. Open <https://vercel.com/dashboard> and sign in.
2. Click the **`gym-app`** project.
3. Click the **Deployments** tab.
4. Find the last deployment that was known good — match it against the `dpl_` id you recorded in
   §4.2, or the **Created** time.
5. Click the **⋯** menu at the right of that row.
6. Click **Instant Rollback** (older UIs: **Promote to Production**).
7. Confirm in the dialog.
8. Back in this terminal, verify **against the tree that matches that deployment**, otherwise the
   byte-length check will correctly report a mismatch against newer local files. Extract that
   commit and point `TREE` at it — **do not `git stash` and do not check out another ref**, both
   mutate the shared working tree (CLAUDE.md §4b):

   ```sh
   OLD=$(mktemp -d)
   for f in $FILES; do mkdir -p "$OLD/$(dirname "$f")"
     git -C "$REPO" cat-file blob "<good-sha>:$f" > "$OLD/$f"; done
   TREE="$OLD" COMMIT="<good-sha>" sh "$REPO/scripts/verify-deploy.sh"
   ```

### 6.2 API

```sh
curl -sS -X POST \
  "https://api.vercel.com/v9/projects/gym-app/rollback/dpl_PREVIOUS_GOOD_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

### 6.3 Last resort — redeploy from git

Every deployment is a snapshot of a commit, so a known-good commit can always be rebuilt.

**The instruction that used to be here was dangerous and is withdrawn.** It said `git stash -u`,
`git checkout <sha>`, redeploy, `git checkout <branch> && git stash pop`. In a worktree shared by
several agents that is a way to destroy unfinished work: `stash -u` sweeps up every other agent's
in-progress file, the checkout moves the tree under them mid-edit, and a `stash pop` conflict at
2 a.m. is how you lose the thing you were trying to protect.

Redeploy from an extract instead. **Nothing touches the working tree:**

```sh
SHA=<last-good-sha>
TREE=$(mktemp -d)
for f in $FILES; do mkdir -p "$TREE/$(dirname "$f")"
  git -C "$REPO" cat-file blob "$SHA:$f" > "$TREE/$f"; done
# then §4.3 and §4.4 unchanged, with $TREE as the source
```

---

## 7. The permanent fix — install the Vercel GitHub App (E-2)

This replaces everything above with `git push`. Chady must do it; it needs his GitHub account.

1. Go to <https://vercel.com/dashboard> and sign in with the GitHub account that owns
   `chadyantoun-ux/Gym-App`.
2. Click the **`gym-app`** project.
3. Click **Settings** (top nav of the project).
4. Click **Git** in the left sidebar.
5. Click **Connect Git Repository**.
6. Choose **GitHub**. If prompted, click **Install** / **Configure** to add the Vercel GitHub App.
7. On GitHub's install screen, choose **Only select repositories**, pick **`Gym-App`**, click
   **Install**. (Not "All repositories" — it only needs this one.)
8. Back on Vercel, select **`chadyantoun-ux/Gym-App`** and click **Connect**.
9. Set **Production Branch** to `main`. Leave everything else alone.
10. In **Settings → Build & Deployment**, confirm:
    - **Framework Preset:** `Other`
    - **Build Command:** empty, **Override** off
    - **Output Directory:** empty, **Override** off
    - **Install Command:** empty, **Override** off
    - **Root Directory:** empty
    Anything else here reintroduces a build step, which is a defect (CLAUDE.md §3.1).
11. Confirm repo visibility is **Private**. This is a personal training log.

After that: a push to `main` deploys production; a push to any other branch gets its own preview
URL. `scripts/verify-deploy.sh` still applies — point it at the preview URL before merging.

---

## 8. Checklist — copy this into the release note

- [ ] `$SHA` pinned once (§4.1) and recorded; extract built with `git cat-file blob`
- [ ] Working tree NOT stashed, checked out or cleaned
- [ ] Credential grep (§3) against `$TREE` returned nothing
- [ ] Scope settled: `$TEAM` empty or `?teamId=...`, proven by a 200 on the project read (§4.2)
- [ ] Previous production `dpl_` id recorded (§4.2)
- [ ] **Preview deployed and verified first** (§4.0)
- [ ] `$WANT` = 11 + N computed from the manifest at the pinned SHA (59 today); the extract holds N JPEGs
- [ ] `$WANT` uploads, all HTTP 200/201, `$OK` = `$WANT`
- [ ] `grep -o '"file"' body.json | wc -l` printed **`$WANT`** (NOT `grep -c`, which always prints 1)
- [ ] `verify-deploy.sh` printed `one set in all three places` before fetching (else exit 2: regenerate, do not deploy)
- [ ] If a photo changed or the set changed: `sw.js` `VERSION` bumped in the same commit
- [ ] `meta.commit` in the body is a real SHA, not an empty string
- [ ] Deployment `readyState: READY`
- [ ] `TREE=... COMMIT=... sh scripts/verify-deploy.sh <preview-url>` exits **0**
- [ ] Only then production, and `verify-deploy.sh` against it exits **0**
- [ ] Installed PWA opens, closes, reopens on the new build
- [ ] Airplane mode: app opens and a full session logs
- [ ] Airplane mode: a "movement & cue" disclosure shows both photographs (second launch after the deploy — the set lands on the first)
- [ ] `/tests.html` loads on the phone
- [ ] Vercel token rotated if it has ever been pasted anywhere

---

## 9. What is proven, and what is still not — as of 2026-09-11

This section exists because the honest answer to "has this procedure ever been run?" is *partly*,
and a release engineer who blurs that line is the reason deploys fail at 5 a.m. Read it before
trusting any step above.

### Proven by execution

| Step | Evidence |
|---|---|
| §4.1 pinned-SHA extract | Built for all ten files; PNGs byte-identical to the worktree |
| §4.1 CRLF hazard | Measured: `git archive` inflates `tests.html` 527,241 → 535,996 bytes |
| §4.1 SHA pinning | `HEAD` observed moving twice in ten minutes under concurrent agents |
| §4.3 digest loop | Ran with the upload stubbed; 10/10 entries, correct sizes and SHA-1s |
| §4.4 body construction | Output parses as valid JSON, `files.length === 10` at the time (11 since E-3), no `target` key |
| §4.4 file-count guard | `grep -c` returns 1, not 10 — defect found and corrected |
| §4.4 `meta` | Returned empty strings from the extract — defect found and corrected |
| §5 `verify-deploy.sh` | Exit **0**, `PASS 10/10`, against a stand-in origin serving the extract |
| §5 CRLF diagnosis | Exits 1 and names line endings on the 4 affected files, not the other 6 |
| §5 against production | Exit 1: 3 stale files, 7 × 404 — correct for the old three-file build |
| §2/§5 photo set (2026-09-12, W3) | Against a stand-in origin serving the tree: `PASS 59/59 (eleven + 48 photographs)`, exit 0. With one JPEG removed from the tree: exit 2, `in manifest, not on disk : assets/ex/Leg_Press-1.jpg`. With one entry deleted from `sw.js` by hand: exit 2, `in manifest, not in sw.js : assets/ex/Spider_Curl-0.jpg`. With the origin 404ing one photo: exit 1, `FAIL assets/ex/Seated_Leg_Curl-1.jpg HTTP 404` |
| `sw.js` v5 install and gap-fill (2026-09-12) | Playwright: `phat-shell-v5` holds 57 entries (2 + 7 + 48) after install; all 48 decode offline from cache; one photo evicted by hand is back after the next navigation with exactly one origin fetch, and a present photo is fetched zero times |

### NOT proven — no Vercel token was available, so no API call was made

1. **`POST /v2/files` with `x-vercel-digest`.** Whether it returns 200/201 on this project, or
   `forbidden` for want of a `teamId`, **is still open.** §4.2 now makes the scope question a
   cheap pre-flight read instead of a surprise 900 KB into the upload, which is the best that can
   be done without the token — but it is mitigation, not an answer.
2. **A 527 KB `tests.html` uploading cleanly.** Untested. It is the largest file by far and the
   most likely to hit a body-size limit. Watch it specifically.
3. **All-null `projectSettings` producing a static, build-free deployment.** Inference from the
   API docs, not observation.
4. **The READY polling loop.** Response shape taken from the docs; never run.
5. **`verify-deploy.sh` exiting 0 against a real Vercel deployment.** It exits 0 against a
   stand-in origin, which proves the script. It does not prove the deployer and the verifier
   agree about what Vercel actually serves — in particular **the content-type Vercel returns for
   `manifest.webmanifest`**. The script requires the type to contain `json`; the stand-in served
   `application/manifest+json`, which passes. If Vercel serves `text/plain` or
   `application/octet-stream` for an unknown extension, this check fails on an otherwise good
   deploy. **First real deploy: look at that line before anything else.**

### The consequence

Items 1–5 must be exercised on a **preview** deployment before the production one, exactly as §4.0
says. The remaining unknowns are now small, named and front-loaded, rather than discovered in the
middle of a release — but they are unknowns, and the first run of §4.3–4.5 against the live API is
still a first run.
