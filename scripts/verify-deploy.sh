#!/usr/bin/env sh
# verify-deploy.sh - prove what is actually live, by fetching the bytes.
# ---------------------------------------------------------------------------
# WHY THIS EXISTS: this project has no git-linked Vercel. Every release is a
# manual multi-file upload, and the historical failure mode is a PARTIAL one:
# a new index.html over a stale or missing logic.js is a black screen on his
# phone in the gym. A deploy that "succeeded" in a dashboard has told you
# nothing about that. So this script asks the only question that matters -
# are the bytes at the origin the bytes in this working tree?
#
# IT NEVER LOOKS AT A BUILD STATUS. No API token, no auth, no dashboard. It is
# a stranger with curl, which is exactly what his phone is.
#
# USAGE
#   sh scripts/verify-deploy.sh                        # production origin
#   sh scripts/verify-deploy.sh https://<preview>.vercel.app
#   ORIGIN=https://... sh scripts/verify-deploy.sh
#   TREE=/path/to/extracted/tree sh scripts/verify-deploy.sh https://<preview>
#   COMMIT=<sha> TREE=... sh scripts/verify-deploy.sh https://<preview>
# Run it from anywhere; with no TREE it locates the repo from its own path.
#
# TREE EXISTS BECAUSE OF A REAL FALSE ALARM. This script compares the origin
# against a LOCAL directory. By default that is the working tree - which, in
# this repo, several agents are editing at once. If you deployed from a
# pinned-SHA extract (docs/deploy.md 4.1) you must point TREE at that same
# extract, or every uncommitted edit in the worktree is reported as a failed
# deploy. Deploy source and verify source must be the same bytes.
#
# EXIT CODES
#   0  every file matched
#   1  at least one file failed (each failure is printed with its reason)
#   2  the script could not run at all (no curl, missing local file)
#
# DEPENDENCIES: curl, and the POSIX tools git-bash already has. No node, no
# jq, no npm. Deliberately: the verifier must not need more infrastructure
# than the thing it verifies.

set -u

ORIGIN="${1:-${ORIGIN:-https://gym-app-psi-eight.vercel.app}}"
ORIGIN="${ORIGIN%/}"

# TREE overrides the comparison source. Stated beats inferred: if you deployed
# from an extract, say so here rather than hoping the worktree still matches.
if [ -n "${TREE:-}" ]; then
  [ -d "$TREE" ] || { echo "FATAL: TREE is not a directory: $TREE"; exit 2; }
  ROOT=$(CDPATH= cd -- "$TREE" && pwd)
  ROOT_SRC="TREE override"
else
  ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
  ROOT_SRC="working tree (script location)"
fi

command -v curl >/dev/null 2>&1 || { echo "FATAL: curl not found"; exit 2; }

# --------------------------------------------------------------------------
# THE THIRTEEN, PLUS THE PHOTO SET. Every file a released build must serve, in
# the order deploy.md uploads them. Format:
#   <path>|<substring the content-type MUST contain>
#
# Nine core files plus four icons (sync.js since E-3; diag.html and
# assets/exercises.json added 2026-09-28, WO-014 W3). The icons are NOT
# optional: manifest.webmanifest names them by path, so a 404 on one is a
# degraded install (no home-screen icon, and on iOS no icon at all), and sw.js
# refuses to commit a cache entry for a non-200, which fails the install
# outright.
#
# TWO ENTRIES ADDED ON 2026-09-28, ONE OF THEM A HOLE THIS SCRIPT ALREADY HAD:
#   diag.html              shipped with WO-011 and has been LIVE AND UNVERIFIED
#                          since. The script said "eleven" while the deploy was
#                          twelve, so a deploy that dropped diag.html would have
#                          printed PASS. diag.html is the first thing opened
#                          when the phone and the server disagree; a 404 on it
#                          is silent until the morning it is needed.
#   assets/exercises.json  WO-014: the exercise library. On sw.js's REQUIRED
#                          list, so the phone precaches it; a 404 is a failed
#                          service-worker install for a first-time installer,
#                          and no mid-workout swap for everyone else.
#
# Keep this list identical to the file list in docs/deploy.md. If you add a
# fourteenth file to the deploy, add it here in the same commit - a file that
# is deployed but unverified is the exact risk this script was written for,
# and diag.html is the proof that it happens.
#
# THE PHOTOGRAPHS (WO-009) ARE NOT IN THIS LIST AND MUST NEVER BE TYPED HERE.
# They are read from assets/ex/manifest.json below, and before a single byte
# is fetched this script asserts that the manifest, the PHOTOS array in
# sw.js and the JPEGs on disk name the same set. Forty-eight paths is a list
# nobody checks by eye, so the script refuses to run (exit 2) when the three
# disagree, rather than verifying one list while the phone installs another.
# --------------------------------------------------------------------------
CORE_FILES='
index.html|text/html
logic.js|javascript
tests.html|text/html
diag.html|text/html
assets/archivo-inline.css|text/css
assets/exercises.json|json
manifest.webmanifest|json
sw.js|javascript
sync.js|javascript
'

# The icons the manifest names. A 404 here is a degraded install, and it was
# also a failed service-worker install until B-68 was closed - sw.js refuses
# to cache a non-200. Checked as hard failures, not warnings.
ICON_FILES='
assets/icon-192.png|image/png
assets/icon-512.png|image/png
assets/icon-maskable-512.png|image/png
assets/apple-touch-icon-180.png|image/png
'

TMP=$(mktemp -d 2>/dev/null || mktemp -d -t phatverify)
trap 'rm -rf "$TMP"' EXIT INT TERM

FAILED=0
CHECKED=0

fail() { FAILED=$((FAILED+1)); printf 'FAIL  %-32s %s\n' "$1" "$2"; }
pass() { printf 'ok    %-32s %s\n' "$1" "$2"; }

check_one() {
  path=$1
  want_ct=$2
  CHECKED=$((CHECKED+1))

  local_file="$ROOT/$path"
  if [ ! -f "$local_file" ]; then
    echo "FATAL: local file missing, nothing to compare against: $local_file"
    exit 2
  fi
  want_len=$(wc -c < "$local_file" | tr -d ' ')

  body="$TMP/body"
  # No --compressed: curl sends no Accept-Encoding, so size_download is the
  # real resource length and not a gzip transfer size. -f is NOT used, because
  # a 404 body is something we want to measure and report, not discard.
  meta=$(curl -sS --max-time 30 \
              -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
              -o "$body" \
              -w '%{http_code}|%{content_type}|%{size_download}' \
              "$ORIGIN/$path" 2>"$TMP/err")
  rc=$?
  if [ $rc -ne 0 ]; then
    fail "$path" "curl failed (exit $rc): $(tr -d '\r\n' < "$TMP/err")"
    return
  fi

  # '|' as the separator, not a space: a content-type carries one
  # ("text/html; charset=utf-8") and field-splitting on it shifts the length
  # into the type. Caught by set -u the first time this ran.
  code=$(printf '%s' "$meta"    | cut -d'|' -f1)
  ctype=$(printf '%s' "$meta"   | cut -d'|' -f2 | tr 'A-Z' 'a-z')
  got_len=$(printf '%s' "$meta" | cut -d'|' -f3)

  if [ "$code" != "200" ]; then
    fail "$path" "HTTP $code (expected 200), ${got_len} bytes of '${ctype}'"
    return
  fi

  case "$ctype" in
    *"$want_ct"*) : ;;
    *) fail "$path" "content-type '$ctype' does not contain '$want_ct' - a 404 page served as HTML is exactly this"
       return ;;
  esac

  if [ "$got_len" != "$want_len" ]; then
    # Before crying "stale upload", rule out the one benign cause of a length
    # mismatch: line endings. `git archive` on this machine (core.autocrlf=true)
    # rewrites LF to CRLF, so a perfectly good deploy made from an archive
    # extract reports +1 byte per line against an LF worktree - 8755 bytes on
    # tests.html alone. That false alarm, read at 5am, says "roll back".
    # Naming it costs one comparison and saves the rollback.
    if [ "$(tr -d '\r' < "$body" | wc -c | tr -d ' ')" \
       = "$(tr -d '\r' < "$local_file" | wc -c | tr -d ' ')" ]; then
      fail "$path" "length $got_len live vs $want_len local, but IDENTICAL once CR is stripped - this is a CRLF/LF difference, not a stale upload. You deployed from a 'git archive' extract; use 'git cat-file blob' (docs/deploy.md 4.1) or point TREE at the extract you actually deployed"
      return
    fi
    fail "$path" "length $got_len live vs $want_len local (differs by $((got_len - want_len)) bytes) - STALE OR PARTIAL UPLOAD"
    return
  fi

  # Length can match while the content does not. Free to check, so check.
  if ! cmp -s "$body" "$local_file"; then
    fail "$path" "same length ($got_len) but the bytes differ from the local file"
    return
  fi

  pass "$path" "200  $ctype  $got_len bytes, byte-identical to local"
}

echo "verify-deploy - fetching the bytes, not a build status"
echo "origin : $ORIGIN"
echo "tree   : $ROOT"
echo "source : $ROOT_SRC"
if [ -n "${COMMIT:-}" ]; then
  # An extract is not a git checkout, so it cannot report its own provenance.
  # Pass the SHA you pinned in deploy.md 4.1 and the output documents itself.
  echo "commit : $COMMIT (stated)"
else
  echo "commit : $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo 'not a git checkout - pass COMMIT=<sha> to record which one') on $(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
fi
echo

# --------------------------------------------------------------------------
# THE PHOTO SET, from the manifest. Three lists must agree before anything is
# fetched: (a) assets/ex/manifest.json `files` rows, (b) the generated PHOTOS
# array in sw.js, (c) assets/ex/*.jpg on disk. Each is a SET, compared sorted,
# not just a count - 48 == 48 with one path swapped is still a wrong install.
# The manifest's own `count` header must match its rows, and each row's
# `bytes` must match the file on disk, or the manifest is stale (re-run
# scripts/make-photos.mjs). Any disagreement is exit 2: the script cannot
# know which list is right, so it verifies none of them.
#
# With TREE pointing at an extract, the extract must contain
# assets/ex/manifest.json and sw.js as well as the JPEGs (deploy.md 4.1 copies
# them). No jq: the manifest writes one `files` row per line on purpose.
# --------------------------------------------------------------------------
MANIFEST="$ROOT/assets/ex/manifest.json"
[ -f "$MANIFEST" ] || { echo "FATAL: $MANIFEST is missing - the photo list is unknowable, so nothing is verified. Run scripts/make-photos.mjs, or copy the manifest into TREE."; exit 2; }
[ -f "$ROOT/sw.js" ] || { echo "FATAL: $ROOT/sw.js is missing"; exit 2; }

# (a) manifest rows: path and bytes, in manifest order.
grep '"path":"assets/ex/' "$MANIFEST" \
  | sed 's/.*"path":"\([^"]*\)".*"bytes":\([0-9]*\).*/\1|\2/' > "$TMP/man"
MAN_N=$(wc -l < "$TMP/man" | tr -d ' ')
MAN_HDR=$(grep -o '"count": *[0-9]*' "$MANIFEST" | head -1 | grep -o '[0-9]*$')
# (b) sw.js PHOTOS array, between the GENERATED markers only.
sed -n '/GENERATED by scripts\/make-photos.mjs.*-- begin/,/GENERATED by scripts\/make-photos.mjs -- end/p' "$ROOT/sw.js" \
  | grep -o "abs('\./assets/ex/[^']*')" | sed "s/^abs('\.\///; s/')$//" > "$TMP/sw"
SW_N=$(wc -l < "$TMP/sw" | tr -d ' ')
# (c) disk.
( cd "$ROOT" && ls assets/ex/*.jpg 2>/dev/null ) > "$TMP/disk"
DISK_N=$(wc -l < "$TMP/disk" | tr -d ' ')

echo "--- the photo set: manifest header $MAN_HDR, manifest rows $MAN_N, sw.js PHOTOS $SW_N, on disk $DISK_N"
if [ "$MAN_N" -eq 0 ]; then
  echo "FATAL: the manifest lists no photographs. Refusing to run."; exit 2
fi
cut -d'|' -f1 "$TMP/man" | sort > "$TMP/man.s"; sort "$TMP/sw" > "$TMP/sw.s"; sort "$TMP/disk" > "$TMP/disk.s"
if [ "$MAN_HDR" != "$MAN_N" ] || [ "$MAN_N" != "$SW_N" ] || [ "$MAN_N" != "$DISK_N" ] \
   || ! cmp -s "$TMP/man.s" "$TMP/sw.s" || ! cmp -s "$TMP/man.s" "$TMP/disk.s"; then
  echo "FATAL: the photo lists DISAGREE. Refusing to verify a set nobody agrees on."
  comm -23 "$TMP/man.s" "$TMP/sw.s"   | sed 's/^/  in manifest, not in sw.js : /'
  comm -13 "$TMP/man.s" "$TMP/sw.s"   | sed 's/^/  in sw.js, not in manifest : /'
  comm -23 "$TMP/man.s" "$TMP/disk.s" | sed 's/^/  in manifest, not on disk  : /'
  comm -13 "$TMP/man.s" "$TMP/disk.s" | sed 's/^/  on disk, not in manifest  : /'
  echo "  fix: run scripts/make-photos.mjs (it regenerates the manifest AND the sw.js block from map.json); commit all three together."
  exit 2
fi
# Same sets; now the manifest's bytes vs the bytes on disk (a stale manifest).
while IFS='|' read -r p b; do
  [ -n "$p" ] || continue
  have=$(wc -c < "$ROOT/$p" | tr -d ' ')
  if [ "$have" != "$b" ]; then
    echo "FATAL: manifest says $p is $b bytes, the file is $have. The manifest is STALE - run scripts/make-photos.mjs and commit. Refusing to run."
    exit 2
  fi
done < "$TMP/man"
echo "ok    $MAN_N files, one set in all three places, manifest bytes match disk"
echo

# --------------------------------------------------------------------------
# THE EXERCISE LIBRARY (WO-014 W3). Same doctrine as the photo set: three
# places must agree before anything is fetched, and this script refuses to run
# rather than verify a library nobody agrees on.
#   (a) assets/exercises.json is on disk and its own header `count` matches the
#       number of rows in it - a truncated or hand-edited file is caught here,
#       not on his phone in a gym with no signal;
#   (b) sw.js names it on the REQUIRED list, so an installed app precaches it.
#       A library that is in the deploy but not in sw.js is a search that works
#       at home and finds nothing in the gym - the silent failure CLAUDE.md 3.2
#       exists to forbid, and nothing else in this repo would catch it;
#   (c) it is in CORE_FILES above, so the byte comparison below actually runs.
# No jq: the file writes one exercise row per line on purpose, exactly like
# assets/ex/manifest.json.
# --------------------------------------------------------------------------
LIB="$ROOT/assets/exercises.json"
[ -f "$LIB" ] || { echo "FATAL: $LIB is missing - run 'node scripts/make-library.mjs', or copy it into TREE."; exit 2; }
LIB_HDR=$(grep -o '"count": *[0-9]*' "$LIB" | head -1 | grep -o '[0-9]*$')
LIB_ROWS=$(grep -c '^ *{"id":' "$LIB")
LIB_BYTES=$(wc -c < "$LIB" | tr -d ' ')
LIB_IN_SW=$(sed -n '/var REQUIRED *=/,/\]/p' "$ROOT/sw.js" | grep -c "assets/exercises\.json")
echo "--- the exercise library: header count $LIB_HDR, rows $LIB_ROWS, $LIB_BYTES bytes, named in sw.js REQUIRED $LIB_IN_SW time(s)"
if [ -z "$LIB_HDR" ] || [ "$LIB_HDR" != "$LIB_ROWS" ]; then
  echo "FATAL: assets/exercises.json says count=$LIB_HDR but holds $LIB_ROWS rows. It is TRUNCATED or hand-edited."
  echo "  fix: run \"/c/Program Files/nodejs/node.exe\" scripts/make-library.mjs and commit."
  exit 2
fi
if [ "$LIB_IN_SW" -ne 1 ]; then
  echo "FATAL: sw.js's REQUIRED list names assets/exercises.json $LIB_IN_SW times (expected exactly 1)."
  echo "  A library that is deployed but not precached searches fine on wifi and finds"
  echo "  NOTHING in the gym, where he needs it. Refusing to verify."
  exit 2
fi
case "$CORE_FILES" in
  *assets/exercises.json*) ;;
  *) echo "FATAL: assets/exercises.json is not in CORE_FILES, so its bytes would never be fetched. Refusing to verify."; exit 2 ;;
esac
echo "ok    library on disk, self-consistent, on sw.js REQUIRED, and in this script's list"
echo

# --------------------------------------------------------------------------
# THE LIST IS THE CONTRACT (2026-09-28). Everything above this point verifies
# that the files THIS SCRIPT KNOWS ABOUT are live and correct. None of it can
# see a file that was added to the repo and shipped without ever being written
# down - and that is not hypothetical. diag.html was created, deployed by an
# ad-hoc script, and never added to docs/deploy.md or to CORE_FILES. This
# script printed "PASS 59/59" for a fortnight while the deploy was sixty
# files, and a deploy that silently dropped diag.html would have passed too.
#
# So the list is now enforced in BOTH directions:
#   downward  every listed file must be live and byte-identical (below);
#   upward    every deployable-looking file in the tree must be ON the list.
#
# The upward check is what closes the hole. A new top-level .html/.js/.web-
# manifest, or a new assets/*.css/.json/.png, that nobody added to CORE_FILES
# is a HARD FAILURE (exit 2) - the script refuses to certify a deploy whose
# contents it cannot enumerate. Adding a file is then a two-line change:
# the file, and its row here and in docs/deploy.md. That is the cost, and it
# is the point.
#
# NOT_DEPLOYED is the explicit, reasoned exception list. A path goes here only
# with a sentence saying why the app never fetches it. "It is not in the
# deploy" is not a reason; "the app never fetches it, because X" is.
# Deliberately NOT recursive into assets/ex/ - the photographs have their own
# three-way check above, and manifest.json is their authority.
# --------------------------------------------------------------------------
NOT_DEPLOYED='
assets/ex/manifest.json
assets/ex/map.json
'
( cd "$ROOT" && ls *.html *.js *.webmanifest assets/*.css assets/*.json assets/*.png 2>/dev/null ) \
  | sed 's|\\|/|g' | sort -u > "$TMP/onDisk"
: > "$TMP/unlisted"
while read -r f; do
  [ -n "$f" ] || continue
  case "
$NOT_DEPLOYED" in *"
$f
"*) continue ;; esac
  case "$CORE_FILES$ICON_FILES" in
    *"
$f|"*) ;;
    *) echo "$f" >> "$TMP/unlisted" ;;
  esac
done < "$TMP/onDisk"
UNLISTED=$(wc -l < "$TMP/unlisted" | tr -d ' ')
echo "--- the list is the contract: $(wc -l < "$TMP/onDisk" | tr -d ' ') deployable-looking files in the tree, $UNLISTED unlisted"
if [ "$UNLISTED" -ne 0 ]; then
  echo "FATAL: these files are in the tree and on NO list. Refusing to certify a deploy I cannot enumerate."
  sed 's|^|  unlisted: |' "$TMP/unlisted"
  echo "  A file that ships without a row here is invisible to every check in this"
  echo "  repo, and stays invisible until the morning it 404s. diag.html did exactly"
  echo "  this for a fortnight."
  echo "  fix: add it to CORE_FILES or ICON_FILES above AND to the table in"
  echo "  docs/deploy.md section 2, in the same commit - or, if the app genuinely"
  echo "  never fetches it, to NOT_DEPLOYED above with a sentence saying why."
  exit 2
fi
echo "ok    every deployable-looking file in the tree is on this script's list"
echo

# A subshell in a pipeline cannot update FAILED, so feed the loop from a file.
printf '%s\n%s\n' "$CORE_FILES" "$ICON_FILES" | grep '|' > "$TMP/list"

echo "--- the thirteen files a release must serve: nine core, plus the four icons the manifest names"
while IFS='|' read -r p c; do
  [ -n "$p" ] || continue
  check_one "$p" "$c"
done < "$TMP/list"

# Guard against the list above drifting out of step with the manifest: if the
# manifest names an icon this script does not check, the check is a lie.
echo
echo "--- manifest icon list vs this script's icon list"
if [ -f "$ROOT/manifest.webmanifest" ]; then
  miss=0
  for src in $(tr -d ' "' < "$ROOT/manifest.webmanifest" \
               | grep -i '^src:' | sed 's/^src://; s/,$//'); do
    case "$ICON_FILES" in
      *"$src"*) ;;
      *) echo "FAIL  manifest names '$src' which this script does not verify"
         miss=1 ;;
    esac
  done
  [ "$miss" -eq 0 ] && echo "ok    every icon in manifest.webmanifest is checked above"
  FAILED=$((FAILED + miss))
fi

# The photographs. HARD failures, same check_one as the eleven: 200,
# image/jpeg, byte length, byte-identical. A photo that 404s is never cached
# by sw.js (it refuses a non-200), so the slot shows its cue alone on the
# phone for as long as that deploy is live - a silent, permanent degradation
# that no dashboard reports. Listed from the manifest, in manifest order.
echo
echo "--- the photo set: $MAN_N files from assets/ex/manifest.json"
while IFS='|' read -r p b; do
  [ -n "$p" ] || continue
  check_one "$p" "image/jpeg"
done < "$TMP/man"

echo
if [ "$FAILED" -eq 0 ]; then
  echo "PASS  $CHECKED/$CHECKED files live and byte-identical to this tree (thirteen + $MAN_N photographs)."
  exit 0
fi
echo "FAILED  $FAILED of $CHECKED checks. The live app does not match this tree."
echo "        A partial upload is a black screen on his phone. Re-upload the"
echo "        failing files, or roll back to the previous deployment"
echo "        (docs/deploy.md, section 'Rollback')."
exit 1
