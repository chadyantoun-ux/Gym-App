/* Fetch and reduce the exercise library.  WO-014 W3.
   ---------------------------------------------------------------------------
   THIS IS NOT A BUILD STEP. The JSON it writes is committed to the repo and
   the app never runs this file. It is a developer tool, exactly like
   scripts/make-photos.mjs and scripts/make-icons.mjs: run it when the pinned
   SHA moves, commit what it wrote. Nothing stands between Chady and a logged
   set. (CLAUDE.md 3.1 - the constraint is about what ships, not about whether
   Node exists on this machine; it does, at C:\Program Files\nodejs.)

   Run (Node is not on the git-bash PATH):
     "/c/Program Files/nodejs/node.exe" scripts/make-library.mjs
   Flags:
     --offline   do not fetch; fail if the upstream file is not already in the
                 local source cache (re-reduce only)
     --check     write nothing; exit 1 if the output would differ from disk
                 (the byte-reproducibility proof, and a CI-style guard)

   NO npm install. Node's built-in fetch downloads; there is nothing to decode.

   WHAT IT READS - one input, pinned:
     https://raw.githubusercontent.com/yuhonas/free-exercise-db/<SHA>/dist/exercises.json
   WHAT IT WRITES - one output:
     assets/exercises.json

   WHY A REDUCTION AND NOT THE UPSTREAM FILE. Upstream is 1,005,327 bytes; the
   eight fields the app reads are 150 KB of it. The bulk is `instructions`,
   which this app never shows: the coach's cues in docs/coach-audit-addendum.md
   are its instruction layer, and an unreviewed upstream paragraph giving
   technique advice next to a reviewed cue is the wrong-advice failure mode
   this repo keeps closing. `images` is dropped for the same reason F1p gives:
   24 photo ids passed an eye check, 876 did not, and shipping 1,752 unchecked
   frames is not a thing a reviewer said yes to (WO-014 1.4, B-142). `category`
   is dropped because WO-014 W3 says "emit only" these eight; see the note in
   the report - 198 of the 876 rows are stretching / plyometrics / cardio and
   the app cannot currently tell them from strength work.

   NULL MEANS UPSTREAM DID NOT SAY. 77 rows have no `equipment`, 30 no `force`,
   87 no `mechanic`. The key is emitted anyway, with the value `null`, so a
   reader never has to tell "absent" from "unknown" and W1's derivation table
   has somewhere honest to land a refusal. Absent keys would have saved ~2 KB
   and bought an ambiguity.

   BYTE-REPRODUCIBLE. Rows are sorted by id, keys are written in a fixed order,
   one row per line, and `fetched` keeps its previous value when nothing else
   changed - the same trick make-photos.mjs uses, or --check could never pass
   on a second day. The sha256 of the upstream bytes is recorded in the header,
   so a run that silently got different bytes from the same URL is visible.

   SIZE: the run FAILS over BUDGET rather than dropping exercises to fit. Which
   exercises a library contains is Chady's call and the coach's, never a
   script's (WO-014 W3). */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = join(ROOT, 'assets', 'exercises.json');
const SW   = join(ROOT, 'sw.js');

/* ----------------------------------------------------------- constants -- */

/* Pinned, never `main`. The photographs already ship from this commit
   (WO-009 0.3 verified the licence at it), so the library and the photo set
   describe one upstream state and an id in `assets/ex/` is an id in here.
   Moving this SHA is a MIGRATION, not an upgrade: movement ids are
   `mv_<upstream id>` (WO-014 W4.2) and an id that vanishes upstream is a
   logged entry that no longer names a movement. */
const REPO    = 'yuhonas/free-exercise-db';
const SHA     = 'a859101d633a01c4a1a920d6a8ce41dabba0705f';
const LICENCE = 'Unlicense';
const PATH    = 'dist/exercises.json';
const URL_    = `https://raw.githubusercontent.com/${REPO}/${SHA}/${PATH}`;

const BUDGET  = 200 * 1024;          /* bytes, uncompressed. WO-014 W3 ceiling */

/* An id is a path-safe, url-safe token because W4 mints `mv_<id>` from it and
   the frontend puts it in a data- attribute. Verified at this SHA: 876/876. */
const ID_RE = /^[A-Za-z0-9_\-]+$/;

const ARGS    = new Set(process.argv.slice(2));
const OFFLINE = ARGS.has('--offline');
const CHECK   = ARGS.has('--check');

/* ------------------------------------------------------------ download -- */

/* The upstream file is kept outside the repo, keyed by SHA, so a re-run is a
   re-reduce and not a megabyte download. It is the upstream bytes untouched. */
const SRC = join(tmpdir(), 'phat-library-src', SHA);
mkdirSync(SRC, { recursive: true });
const SRC_FILE = join(SRC, 'exercises.json');

async function source() {
  if (existsSync(SRC_FILE)) return readFileSync(SRC_FILE);
  if (OFFLINE) die(`--offline and no cached source at ${SRC_FILE}`);
  const res = await fetch(URL_);
  if (res.status !== 200) die(`${res.status} for ${URL_} - is the SHA still on the origin?`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100000) die(`${URL_} returned only ${buf.length} bytes - that is not the library`);
  writeFileSync(SRC_FILE, buf);
  return buf;
}

const raw = await source();
const upstreamSha256 = createHash('sha256').update(raw).digest('hex');
let up;
try { up = JSON.parse(raw.toString('utf8')); }
catch (e) { die(`upstream is not JSON: ${e.message}`); }
if (!Array.isArray(up) || !up.length) die('upstream is not a non-empty array');
console.log(`upstream ${PATH} @ ${SHA.slice(0, 7)}  ${raw.length} bytes  sha256 ${upstreamSha256.slice(0, 16)}...  ${up.length} rows`);

/* ------------------------------------------------------------- reduce -- */

/* Field order is fixed here and nowhere else. Change it and every byte of the
   output moves, which is the point: the diff is honest about it. */
const str = v => (typeof v === 'string' && v.trim()) ? v.trim() : null;
const arr = v => Array.isArray(v) ? v.map(str).filter(Boolean) : [];

const seen = new Set();
const rows = up.map(x => {
  const id = str(x.id);
  if (!id) die(`a row has no id: ${JSON.stringify(x).slice(0, 120)}`);
  if (!ID_RE.test(id)) die(`id "${id}" is not a safe token - W4 mints mv_<id> from it`);
  if (seen.has(id)) die(`duplicate id "${id}" - an id must name one movement`);
  seen.add(id);
  const n = str(x.name);
  if (!n) die(`"${id}" has no name - a nameless row cannot be searched or shown`);
  return { id, n, eq: str(x.equipment), pm: arr(x.primaryMuscles), sm: arr(x.secondaryMuscles),
           f: str(x.force), m: str(x.mechanic), lv: str(x.level) };
}).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/* Every row must be searchable by at least a name; a row with no primary
   muscle and no equipment is still legitimate upstream data, so it is counted
   and reported, never dropped. Dropping is curating, and curating is not this
   script's call. */
const noPm = rows.filter(r => !r.pm.length).length;
const noEq = rows.filter(r => !r.eq).length;

const tally = k => { const m = new Map(); for (const r of rows) m.set(String(r[k]), (m.get(String(r[k])) || 0) + 1);
                     return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))); };
const equipment = tally('eq');
const muscles = [...new Set(rows.flatMap(r => r.pm.concat(r.sm)))].sort();

/* ------------------------------------------------------------- header -- */

const today = new Date();
const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const prev = existsSync(OUT) ? safeParse(readFileSync(OUT, 'utf8')) : null;

const head = {
  _: 'GENERATED by scripts/make-library.mjs. Do not edit; re-run. One row per movement, reduced from the upstream database to the eight fields this app reads. Keys: id (upstream, and the source of the movement id mv_<id>), n name, eq equipment, pm primary muscles, sm secondary muscles, f force, m mechanic, lv level. A null means UPSTREAM DID NOT SAY, not "none". instructions, images and category are deliberately not here - see the header comment in the generator.',
  source: REPO,
  sha: SHA,
  upstream: PATH,
  upstreamSha256,
  licence: LICENCE,
  licenceFile: 'assets/ex/LICENSE.md',
  generator: 'scripts/make-library.mjs',
  fetched: stamp,               /* replaced below when nothing else moved */
  count: rows.length,
  muscles,
  equipment,
  noEquipment: noEq,
  noPrimaryMuscle: noPm
};

const render = h =>
  '{\n' +
  Object.entries(h).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + ',\n' +
  '  "exercises": [\n' + rows.map(r => '    ' + JSON.stringify(r)).join(',\n') + '\n  ]\n' +
  '}\n';

/* `fetched` is the day THESE UPSTREAM BYTES were pulled, not the day this ran.
   It is kept whenever the upstream hash is unchanged - including across a
   change to the reducer, because editing this script does not re-date the
   download. Without this, --check goes red at every midnight and stops
   meaning anything. (make-photos.mjs learned the same lesson.) */
if (prev && prev.fetched && prev.upstreamSha256 === upstreamSha256) head.fetched = prev.fetched;
const json = render(head);

const bytes = Buffer.byteLength(lf(json));
const sha256 = createHash('sha256').update(Buffer.from(lf(json), 'utf8')).digest('hex');

/* --------------------------------------------------------------- write -- */

let differ = 0;
writeOrCheck(OUT, json);

/* ---------------------------------------------------------- tripwires -- */

/* This script does not edit sw.js - one path is not a generated block - but a
   library that is not precached fails CLAUDE.md 3.2 silently, and the only
   symptom is "search finds nothing" in a gym with no signal. So it refuses to
   pass if sw.js has stopped naming the file. Same spirit as verify-deploy.sh
   refusing to run on three disagreeing photo lists. */
const sw = existsSync(SW) ? readFileSync(SW, 'utf8') : '';
const named = sw.includes("abs('./assets/exercises.json')");
const required = /var REQUIRED\s*=\s*\[[^\]]*assets\/exercises\.json/.test(sw.replace(/\r\n/g, '\n'));
console.log(`sw.js names assets/exercises.json : ${named}${named && required ? ' (in REQUIRED)' : ''}`);

/* ------------------------------------------------------------- summary -- */

console.log('');
console.log(`rows       ${rows.length}`);
console.log(`bytes      ${bytes} (${(bytes / 1024).toFixed(1)} KB) - budget ${BUDGET} (${(BUDGET / 1024).toFixed(0)} KB)`);
console.log(`sha256     ${sha256}`);
console.log(`equipment  ${Object.entries(equipment).map(([k, v]) => `${k}=${v}`).join('  ')}`);
console.log(`muscles    ${muscles.length}: ${muscles.join(' ')}`);
console.log(`gaps       ${noEq} rows with no equipment, ${noPm} with no primary muscle (kept, not dropped)`);

if (!named) die('sw.js does not name assets/exercises.json - the library would not be cached, and a swap in the gym would find nothing. Add it to the REQUIRED list and bump VERSION.');
if (bytes > BUDGET) die(`over budget by ${bytes - BUDGET} bytes. STOP AND REPORT THE NUMBER. Do not curate the set to fit - which movements ship is not this script's call (WO-014 W3).`);
if (CHECK) {
  console.log(differ ? `CHECK: the output differs from disk - run without --check` : 'CHECK: assets/exercises.json on disk is byte-identical to a fresh run');
  process.exit(differ ? 1 : 0);
}
console.log('done');

/* ------------------------------------------------------------- helpers -- */

function lf(s) { return s.replace(/\r\n/g, '\n'); }
function safeParse(s) { try { return JSON.parse(s); } catch (_e) { return null; } }

/* Text outputs are compared and written modulo line endings: core.autocrlf is
   true on this machine, so a checked-out text file is CRLF while the index is
   LF, and a byte compare would report the file changed on every run. A file
   that exists keeps whichever ending it has; a new file is LF. The SIZE and
   HASH reported above are always of the LF form - that is what `git cat-file
   blob` emits and therefore what the deploy uploads and the phone downloads. */
function writeOrCheck(path, text) {
  const cur = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (cur !== null && lf(cur) === lf(text)) { console.log(`   ${rel(path)} unchanged`); return; }
  differ++;
  if (CHECK) { console.log(`XX ${rel(path)} would change`); return; }
  writeFileSync(path, (cur !== null && cur.includes('\r\n')) ? lf(text).replace(/\n/g, '\r\n') : lf(text));
  console.log(`wr ${rel(path)}`);
}
function rel(p) { return p.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, ''); }
function die(msg) { console.error('FATAL: ' + msg); process.exit(2); }
