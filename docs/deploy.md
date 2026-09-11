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

## 2. The file list

WO-005 says six files. With B-68 closed (the placeholder icons now exist on disk) it is **ten** —
the four PNGs are new as of 2026-09-11. Upload them in this order; the order does not matter to
Vercel, but keeping one order means a half-finished upload is obvious in the terminal.

| # | Path | Content-type Vercel serves | Why it is load-bearing |
|---|---|---|---|
| 1 | `index.html` | `text/html` | The app |
| 2 | `logic.js` | `application/javascript` | The app does not run without it. `index.html` has a guard that says so in words rather than showing a black screen |
| 3 | `tests.html` | `text/html` | The QA harness, deployed deliberately so the manual checklist can be run from the phone |
| 4 | `assets/archivo-inline.css` | `text/css` | The typeface. Missing = fallback stack, and every 44 px measurement was taken against Archivo |
| 5 | `manifest.webmanifest` | `application/json` | No manifest, no install prompt, no PWA |
| 6 | `sw.js` | `application/javascript` | Offline. Missing = the gym has no app |
| 7 | `assets/icon-192.png` | `image/png` | Named by the manifest |
| 8 | `assets/icon-512.png` | `image/png` | Named by the manifest |
| 9 | `assets/icon-maskable-512.png` | `image/png` | Named by the manifest |
| 10 | `assets/apple-touch-icon-180.png` | `image/png` | Named by `sw.js`'s precache list; iOS home screen |

Nothing else. No `docs/`, no `scripts/`, no `.snapshots/`, no `CLAUDE.md`. There is **no
`vercel.json`** and there must not be one with a build command in it — static files, no framework,
no build step (CLAUDE.md §3.1).

The authoritative copy of this list lives in **two** places that must agree:
`scripts/verify-deploy.sh` (`CORE_FILES` + `ICON_FILES`) and this table. Change one, change the
other, in the same commit.

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
  index.html logic.js tests.html sw.js manifest.webmanifest assets/archivo-inline.css \
  && echo "STOP: something credential-shaped is in a file about to be deployed"
```

Today the correct result is no matches. The Supabase **anon** key may appear in client code later —
it is designed to be public — but only once RLS is on every table. The **`service_role`** key never
appears anywhere except Vercel's environment variables. There are no Vercel env vars set on this
project today and none are needed: the browser talks to Supabase directly, and there is no Supabase
yet.

---

## 4. The deploy

Run from the repo root, on a clean tree, on the commit you intend to ship.

### 4.1 Pre-flight

```sh
cd "/c/Users/Chady/Desktop/Phat Gym Track"
git status --short              # must be empty. Never deploy an uncommitted tree.
git rev-parse --short HEAD      # write this SHA down; it goes in the deploy meta and the report
ls -l index.html logic.js tests.html sw.js manifest.webmanifest assets/
```

Then the credential grep from §3.

### 4.2 Record the deployment you are about to replace — **do this before uploading**

Rollback needs a target id, and the easiest moment to lose it is after a bad deploy.

```sh
curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?app=gym-app&limit=5&target=production"
```

Copy the `uid` (looks like `dpl_...`) and `url` of the current **READY** production deployment into
your notes. That is the rollback target in §6.

> If this returns `{"error":{"code":"forbidden"}}` the project is under a team, not your personal
> scope. Get the team id with `curl -sS -H "Authorization: Bearer $VERCEL_TOKEN"
> https://api.vercel.com/v2/teams` and append `&teamId=team_...` to this and every call below.

### 4.3 Upload the file bodies

Each file is uploaded once, addressed by its SHA-1. Vercel stores it and the deployment then
references it by digest — which is also why a typo in a digest is a missing file rather than a
corrupt one.

```sh
FILES="index.html logic.js tests.html assets/archivo-inline.css manifest.webmanifest sw.js \
assets/icon-192.png assets/icon-512.png assets/icon-maskable-512.png assets/apple-touch-icon-180.png"

WORK=$(mktemp -d); : > "$WORK/entries"

for f in $FILES; do
  [ -f "$f" ] || { echo "MISSING LOCALLY: $f - stop, do not deploy"; break; }
  sha=$(sha1sum "$f" | cut -d' ' -f1)
  size=$(wc -c < "$f" | tr -d ' ')
  code=$(curl -sS -o "$WORK/resp" -w '%{http_code}' -X POST \
    "https://api.vercel.com/v2/files" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/octet-stream" \
    -H "x-vercel-digest: $sha" \
    -H "Content-Length: $size" \
    --data-binary "@$f")
  echo "$f  $size bytes  sha=$sha  HTTP $code"
  case "$code" in 200|201) ;; *) echo "UPLOAD FAILED: $f"; cat "$WORK/resp"; break ;; esac
  printf '{"file":"%s","sha":"%s","size":%s},' "$f" "$sha" "$size" >> "$WORK/entries"
done
```

**Check the printed count is 10 and every line says HTTP 200 or 201 before continuing.** If any
line failed, fix it and re-run the whole loop. A partial upload here is harmless — nothing is live
until §4.4 — but a partial `entries` file is the black screen.

### 4.4 Create the deployment

```sh
{ printf '{"name":"gym-app","project":"gym-app","target":"production",'
  printf '"projectSettings":{"framework":null,"buildCommand":null,"installCommand":null,'
  printf '"outputDirectory":null,"devCommand":null},'
  printf '"meta":{"commit":"%s","branch":"%s"},' \
    "$(git rev-parse HEAD)" "$(git rev-parse --abbrev-ref HEAD)"
  printf '"files":[%s]}' "$(sed 's/,$//' "$WORK/entries")"
} > "$WORK/body.json"

grep -c '"file"' "$WORK/body.json"        # must print 10

curl -sS -X POST "https://api.vercel.com/v13/deployments?forceNew=1&skipAutoDetectionConfirmation=1" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "@$WORK/body.json"
```

`projectSettings` with every command `null` is what keeps this a static deploy. **Do not add a
framework preset or a build command** — CLAUDE.md §3.1, and a build step here is a defect, not a
convenience.

The response carries `id` (`dpl_...`) and `readyState`. `$WORK` is a temp directory outside the
repo; it holds no token, but delete it anyway: `rm -rf "$WORK"`.

### 4.5 Wait for READY

```sh
curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v13/deployments/dpl_XXXX" | tr ',' '\n' | grep -i 'readyState\|"url"'
```

`QUEUED` → `BUILDING` → `READY`. With no build step this takes seconds. `ERROR` means stop and read
the response; do not retry blindly.

---

## 5. Verify — by fetching the bytes, never by reading a dashboard

```sh
sh scripts/verify-deploy.sh
```

It fetches all ten files from `https://gym-app-psi-eight.vercel.app` and fails unless each returns
**200**, a content-type containing the expected token, a byte length equal to the local file, and
bytes identical to the local file. It exits non-zero and names every failure. It uses no token and
no API — it is a stranger with `curl`, which is exactly what his phone is.

A green dashboard with a 404 on `/logic.js` is a state this project has actually been in. **The
dashboard is not evidence. The bytes are.**

To check a preview or a specific deployment URL instead of production:

```sh
sh scripts/verify-deploy.sh https://gym-app-xxxxxx.vercel.app
```

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

- the **file list** in `CORE`/`OPTIONAL` changes, or
- a cached entry must be actively discarded (a file was renamed or removed).

Bumping it needlessly forces every installed app to rebuild its shell from the network — which, for
someone standing in a gym with no signal, is the opposite of what this file is for.

---

## 6. Rollback

The recovery path, in order of preference. **Rollback is always cheaper than a fix-forward deploy at
2 a.m.**

### 6.1 Dashboard — instant, and the one to use under pressure

1. Open <https://vercel.com/dashboard> and sign in.
2. Click the **`gym-app`** project.
3. Click the **Deployments** tab.
4. Find the last deployment that was known good — match it against the `dpl_` id you recorded in
   §4.2, or the **Created** time.
5. Click the **⋯** menu at the right of that row.
6. Click **Instant Rollback** (older UIs: **Promote to Production**).
7. Confirm in the dialog.
8. Back in this terminal, run `sh scripts/verify-deploy.sh` **against the tree that matches that
   deployment** — i.e. `git stash` or check out the commit it was built from first, otherwise the
   byte-length check will correctly report a mismatch against the newer local files.

### 6.2 API

```sh
curl -sS -X POST \
  "https://api.vercel.com/v9/projects/gym-app/rollback/dpl_PREVIOUS_GOOD_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

### 6.3 Last resort — redeploy from git

Every deployment is a snapshot of a commit, so a known-good commit can always be rebuilt:

```sh
git stash -u                 # protect any in-flight work first
git checkout <last-good-sha>
# run §4.3 and §4.4 unchanged
git checkout wo-004-redesign && git stash pop
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

- [ ] `git status --short` empty; HEAD SHA recorded
- [ ] Credential grep (§3) returned nothing
- [ ] Previous production `dpl_` id recorded (§4.2)
- [ ] 10 uploads, all HTTP 200/201
- [ ] `grep -c '"file"' body.json` printed **10**
- [ ] Deployment `readyState: READY`
- [ ] `sh scripts/verify-deploy.sh` exits **0**
- [ ] Installed PWA opens, closes, reopens on the new build
- [ ] Airplane mode: app opens and a full session logs
- [ ] `/tests.html` loads on the phone
- [ ] Vercel token rotated if it has ever been pasted anywhere
