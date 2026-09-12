/* Fetch, resize and register the exercise photographs.  WO-009 W3.
   ---------------------------------------------------------------------------
   THIS IS NOT A BUILD STEP. The JPEGs it writes are committed to the repo and
   the app never runs this file. It is a developer tool, like make-icons.mjs:
   run once when the map changes, commit what it wrote.

   Run (Node is at C:\Program Files\nodejs, not on the git-bash PATH):
     "/c/Program Files/nodejs/node.exe" scripts/make-photos.mjs
   Flags:
     --offline   do not fetch; fail if a source frame is not already in the
                 local source cache (re-encode only)
     --check     write nothing; exit 1 if any output would differ from disk
                 (idempotency proof, and a CI-style guard)

   NO npm install. Node's built-in fetch downloads; the Playwright already at
   ~/AppData/Roaming/npm/node_modules/playwright drives a headless Chromium
   canvas for the resize + JPEG encode, because Node has no image decoder.

   WHAT IT READS - one input, the coach's table:
     assets/ex/map.json   { slotId: upstreamId }  transcribed from
                          docs/coach-audit-addendum.md 17.2 / 17.8, rows at
                          `pass` only. Rule F1p: a slot the coach has not
                          passed by eye is `none`, and `none` is simply absent
                          from this file.
   WHAT IT WRITES - everything else derives from these, never from a hand list:
     assets/ex/<id>-0.jpg      the START frame,  320 px wide, aspect kept
     assets/ex/<id>-1.jpg      the END frame
     assets/ex/manifest.json   the single source for sw.js, verify-deploy.sh,
                               offline-check.mjs and the deploy upload loop
     sw.js                     the PHOTOS array between the GENERATED markers
     assets/ex/SOURCES.md      per file, its upstream path at the pinned SHA

   FRAME ORDER. Upstream `0.jpg` is USUALLY the start of the rep and `1.jpg`
   the end, but not always: the 2026-09-12 eye check (17.8) found five pairs
   the other way round, plus Leg_Press whose bottom is frame 1. So this script
   never assumes. FRAMES below says, per id, which upstream frame is the start
   and which the end; the files on disk are written so that `<id>-0.jpg` IS
   the start and `<id>-1.jpg` IS the end, whatever upstream called them, and
   the manifest records the provenance (`start: "1.jpg"` means the start
   frame came from upstream 1.jpg). The frontend therefore renders -0 then
   -1, always, and needs no table.

   IDEMPOTENT: same input, same Chromium, same bytes. --check proves it.

   SIZE: WIDTH and QUALITY are fixed, not searched, so a file's bytes do not
   depend on which other files are in the set. The run FAILS if the set is
   over BUDGET; lower QUALITY by hand and re-run, do not let a loop pick it. */

import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Chady/AppData/Roaming/npm/node_modules/playwright');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = join(ROOT, 'assets', 'ex');
const SW   = join(ROOT, 'sw.js');

/* ----------------------------------------------------------- constants -- */

/* Pinned. Never `main`: the photographs a slot was passed on are the ones
   at this commit, and a later upstream re-shoot would be an unreviewed
   figure (F1p). WO-009 0.3 verified the licence at this SHA. */
const REPO    = 'yuhonas/free-exercise-db';
const SHA     = 'a859101d633a01c4a1a920d6a8ce41dabba0705f';
const LICENCE = 'Unlicense';
const RAW     = `https://raw.githubusercontent.com/${REPO}/${SHA}/exercises/`;

const WIDTH   = 320;          /* UX 11: 320 px wide, aspect preserved, no crop */
const QUALITY = 0.82;         /* canvas JPEG quality 0..1 */
const BUDGET  = 1.5 * 1024 * 1024;   /* whole set, bytes. WO-009 W3 ceiling */

/* Which upstream frame is the START and which the END, per id, from the eye
   check in addendum 17.2. Anything not listed is `0.jpg` start, `1.jpg` end.
   Every id that ships was read against its row on 2026-09-12; none of the
   five reversed pairs (Dips_-_Triceps_Version, Seated_Dumbbell_Press,
   Stiff-Legged_Barbell_Deadlift, Romanian_Deadlift, Upright_Barbell_Row)
   passed, so none is on disk. Leg_Press: 0 is the sled extended, 1 the
   bottom - the row expected the reverse but the squat and hack squat both
   ship top -> bottom, so 0 -> 1 is kept for the same reading on all three.
   Add an entry here ONLY with a row in 17.2 that says which frame is which. */
const FRAMES = {
  /* 'Some_Id': { start: '1.jpg', end: '0.jpg' }, */
};

const ARGS    = new Set(process.argv.slice(2));
const OFFLINE = ARGS.has('--offline');
const CHECK   = ARGS.has('--check');

/* --------------------------------------------------------------- input -- */

const map = JSON.parse(readFileSync(join(OUT, 'map.json'), 'utf8'));
const slots = Object.keys(map).filter(k => k !== '_').sort();
const ids = [...new Set(slots.map(s => map[s]))].sort();
const ID_RE = /^[A-Za-z0-9_\-]+$/;
for (const id of ids) {
  if (!ID_RE.test(id)) die(`map.json: id "${id}" is not a safe path segment`);
}
for (const id of Object.keys(FRAMES)) {
  if (!ids.includes(id)) die(`FRAMES names "${id}" which is not in map.json - a stale override is a wrong figure`);
}
console.log(`map.json: ${slots.length} slots -> ${ids.length} distinct ids -> ${ids.length * 2} files`);

/* ------------------------------------------------------------ download -- */

/* Source frames are kept outside the repo, keyed by SHA, so a re-run is a
   re-encode and not 48 downloads. They are the upstream bytes untouched. */
const SRC = join(tmpdir(), 'phat-photos-src', SHA);
mkdirSync(SRC, { recursive: true });

async function source(id, frame) {
  const f = join(SRC, `${id}__${frame}`);
  if (existsSync(f) && statSync(f).size > 0) return readFileSync(f);
  if (OFFLINE) die(`--offline and no cached source for ${id}/${frame}`);
  const url = RAW + id + '/' + frame;
  const res = await fetch(url);
  if (res.status !== 200) die(`${res.status} for ${url} - id not at the pinned SHA?`);
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.indexOf('image/jpeg') < 0) die(`${url} is ${ct}, not image/jpeg`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000 || buf[0] !== 0xff || buf[1] !== 0xd8) die(`${url} is not a JPEG`);
  writeFileSync(f, buf);
  return buf;
}

/* -------------------------------------------------------------- resize -- */

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><canvas id="c"></canvas>');

/* Decode -> draw at WIDTH x round(h * WIDTH / w) with high-quality smoothing
   -> JPEG at QUALITY. Returns the bytes and the decoded dimensions. A source
   narrower than WIDTH is never upscaled (it would be a blur, not a photo). */
async function shrink(buf) {
  const r = await page.evaluate(async ([b64, W, Q]) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + b64;
    await img.decode();
    const sw = img.naturalWidth, sh = img.naturalHeight;
    const w = Math.min(W, sw), h = Math.round(sh * w / sw);
    const c = document.getElementById('c');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);       /* JPEG has no alpha; be explicit */
    g.drawImage(img, 0, 0, w, h);
    return { sw, sh, w, h, data: c.toDataURL('image/jpeg', Q).split(',')[1] };
  }, [buf.toString('base64'), WIDTH, QUALITY]);
  return { sw: r.sw, sh: r.sh, w: r.w, h: r.h, bytes: Buffer.from(r.data, 'base64') };
}

/* ----------------------------------------------------------------- run -- */

const sha256 = b => createHash('sha256').update(b).digest('hex');
const files = [];      /* flat, one per JPEG - what the shell reads */
const photos = [];     /* one per id - what a human reads */
let total = 0, largest = { path: '', bytes: 0 }, differ = 0;

for (const id of ids) {
  const fr = FRAMES[id] || { start: '0.jpg', end: '1.jpg' };
  const entry = { id, start: fr.start, end: fr.end, w: 0, h: 0, bytes: 0 };
  for (const [i, role] of [[0, 'start'], [1, 'end']]) {
    const from = fr[role];
    const src = await source(id, from);
    const out = await shrink(src);
    const name = `${id}-${i}.jpg`;
    const path = `assets/ex/${name}`;
    const full = join(OUT, name);
    const same = existsSync(full) && readFileSync(full).equals(out.bytes);
    if (!same) { differ++; if (!CHECK) writeFileSync(full, out.bytes); }
    files.push({ path, id, frame: role, from, w: out.w, h: out.h, bytes: out.bytes.length,
                 sha256: sha256(out.bytes), src: `exercises/${id}/${from}`, srcW: out.sw, srcH: out.sh });
    entry.w = out.w; entry.h = out.h; entry.bytes += out.bytes.length;
    total += out.bytes.length;
    if (out.bytes.length > largest.bytes) largest = { path, bytes: out.bytes.length };
    console.log(`${same ? '  ' : (CHECK ? 'XX' : 'wr')} ${path.padEnd(58)} ${out.sw}x${out.sh} -> ${out.w}x${out.h}  ${String(out.bytes.length).padStart(6)} B  (${role} <- ${from})`);
  }
  photos.push(entry);
}
await browser.close();

/* A stray JPEG that is not in the map is a photo the coach did not pass. */
for (const f of readdirSync(OUT)) {
  if (/\.jpe?g$/i.test(f) && !files.some(x => x.path.endsWith('/' + f))) {
    if (CHECK) { differ++; console.log(`XX stray file not in the map: assets/ex/${f}`); }
    else { unlinkSync(join(OUT, f)); console.log(`rm assets/ex/${f} (not in the map)`); }
  }
}

/* ------------------------------------------------------------ manifest -- */

const today = new Date();
const fetched = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const prev = existsSync(join(OUT, 'manifest.json')) ? JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')) : null;
/* `fetched` is the day the bytes were pulled from the SHA, not the day this
   ran: keep the old date when nothing changed, or --check can never pass. */
const manifest = {
  _: 'GENERATED by scripts/make-photos.mjs from assets/ex/map.json. Do not edit; re-run. `photos` is one row per exercise id: which upstream frame became the start (-0.jpg) and the end (-1.jpg). `files` is one row per JPEG in deploy order; sw.js, verify-deploy.sh, offline-check.mjs and the deploy loop read it.',
  source: REPO, sha: SHA, licence: LICENCE,
  fetched: (prev && prev.sha === SHA && differ === 0 && prev.fetched) ? prev.fetched : fetched,
  width: WIDTH, quality: QUALITY,
  slots: slots.length, ids: ids.length, count: files.length, bytes: total,
  photos, files
};
/* One `files` row per line: the shell tools read this with grep, not jq. */
const json =
  '{\n' +
  Object.entries(manifest).filter(([k]) => k !== 'photos' && k !== 'files')
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + ',\n' +
  '  "photos": [\n' + photos.map(p => '    ' + JSON.stringify(p)).join(',\n') + '\n  ],\n' +
  '  "files": [\n' + files.map(f => '    ' + JSON.stringify(f)).join(',\n') + '\n  ]\n' +
  '}\n';
writeOrCheck(join(OUT, 'manifest.json'), json);

/* ------------------------------------------------------------- SOURCES -- */

const sources =
`# Sources for assets/ex/

GENERATED by \`scripts/make-photos.mjs\`. Do not edit; re-run.

- Repository: https://github.com/${REPO}
- Pinned commit: \`${SHA}\`
- Licence: The Unlicense (public domain) - verbatim copy in \`LICENSE.md\` beside this file
- Fetched: ${manifest.fetched}
- Processed: resized to ${WIDTH} px wide (aspect preserved, no crop), re-encoded as JPEG at
  quality ${QUALITY} by a headless Chromium canvas. Metadata is not carried over. No other change.
- Frame order: \`<id>-0.jpg\` is the START of the rep and \`<id>-1.jpg\` the END, as read by eye
  against \`docs/coach-audit-addendum.md\` 17.2 on 2026-09-12. Where that differs from upstream's
  own numbering the \`from\` column says so.

${ids.length} exercises, ${files.length} files, ${total} bytes.

| File | Upstream path at the pinned commit | Frame | Upstream size |
|---|---|---|---|
${files.map(f => `| \`${f.path}\` | \`${f.src}\` | ${f.frame} | ${f.srcW}x${f.srcH} |`).join('\n')}

Raw URL shape: \`https://raw.githubusercontent.com/${REPO}/${SHA}/<upstream path>\`.
`;
writeOrCheck(join(OUT, 'SOURCES.md'), sources);

/* --------------------------------------------------------------- sw.js -- */

const BEGIN = '/* GENERATED by scripts/make-photos.mjs from assets/ex/manifest.json -- begin */';
const END   = '/* GENERATED by scripts/make-photos.mjs -- end */';
const sw = readFileSync(SW, 'utf8').replace(/\r\n/g, '\n');   /* writeOrCheck restores the file's ending */
const a = sw.indexOf(BEGIN), b = sw.indexOf(END);
if (a < 0 || b < 0 || b < a) die('sw.js: GENERATED markers not found - the PHOTOS block must exist once, begin before end');
const block = BEGIN + '\n' +
  `var PHOTOS = [   /* ${files.length} files, ${ids.length} exercises, ${total} bytes, upstream ${SHA.slice(0, 7)} */\n` +
  files.map((f, i) => `  abs('./${f.path}')${i < files.length - 1 ? ',' : ''}`).join('\n') + '\n];\n';
const swNext = sw.slice(0, a) + block + sw.slice(b);
writeOrCheck(SW, swNext);

/* ------------------------------------------------------------- summary -- */

console.log('');
console.log(`total    ${total} bytes (${(total / 1024).toFixed(1)} KB) for ${files.length} files - budget ${BUDGET} bytes`);
console.log(`largest  ${largest.path} ${largest.bytes} bytes`);
console.log(`mean     ${Math.round(total / files.length)} bytes`);
if (total > BUDGET) die(`over budget by ${total - BUDGET} bytes: lower QUALITY and re-run`);
const wide = files.filter(f => f.w > WIDTH);
if (wide.length) die(`wider than ${WIDTH}: ${wide.map(f => f.path).join(' ')}`);
if (CHECK) {
  console.log(differ ? `CHECK: ${differ} output(s) differ from disk - run without --check` : 'CHECK: every output is byte-identical to disk');
  process.exit(differ ? 1 : 0);
}
console.log('done');

/* ------------------------------------------------------------- helpers -- */

/* Text outputs are compared and written modulo line endings: core.autocrlf is
   true on this machine, so a checked-out text file is CRLF while the index is
   LF, and a byte compare would report every file changed on every run. A
   file that exists keeps whichever ending it has; a new file is LF. */
function writeOrCheck(path, text) {
  const cur = existsSync(path) ? readFileSync(path, 'utf8') : null;
  const lf = s => s.replace(/\r\n/g, '\n');
  if (cur !== null && lf(cur) === lf(text)) return;
  differ++;
  if (CHECK) { console.log(`XX ${path.replace(ROOT, '').replace(/\\/g, '/')} would change`); return; }
  writeFileSync(path, (cur !== null && cur.includes('\r\n')) ? lf(text).replace(/\n/g, '\r\n') : lf(text));
}
function die(msg) { console.error('FATAL: ' + msg); process.exit(2); }
