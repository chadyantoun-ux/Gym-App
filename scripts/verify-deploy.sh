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
# Run it from anywhere; it locates the repo from its own path.
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

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

command -v curl >/dev/null 2>&1 || { echo "FATAL: curl not found"; exit 2; }

# --------------------------------------------------------------------------
# THE SIX. Every file a released build must serve, in the order deploy.md
# uploads them. Format: <path>|<substring the content-type MUST contain>
#
# Keep this list identical to the file list in docs/deploy.md. If you add a
# seventh file to the deploy, add it here in the same commit - a file that is
# deployed but unverified is the same risk this script was written for.
# --------------------------------------------------------------------------
CORE_FILES='
index.html|text/html
logic.js|javascript
tests.html|text/html
assets/archivo-inline.css|text/css
manifest.webmanifest|json
sw.js|javascript
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
echo "commit : $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo 'not a git checkout') on $(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
echo

# A subshell in a pipeline cannot update FAILED, so feed the loop from a file.
printf '%s\n%s\n' "$CORE_FILES" "$ICON_FILES" | grep '|' > "$TMP/list"

echo "--- the six files a release must serve, plus the icons the manifest names"
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

echo
if [ "$FAILED" -eq 0 ]; then
  echo "PASS  $CHECKED/$CHECKED files live and byte-identical to this tree."
  exit 0
fi
echo "FAILED  $FAILED of $CHECKED checks. The live app does not match this tree."
echo "        A partial upload is a black screen on his phone. Re-upload the"
echo "        failing files, or roll back to the previous deployment"
echo "        (docs/deploy.md, section 'Rollback')."
exit 1
