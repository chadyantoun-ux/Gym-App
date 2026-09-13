// The acceptance test for the whole night: install the service worker, cut the
// network, COLD reload, and log a set. Not "does the shell paint" - does a
// number survive. Anything less is a bookmark.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Chady/AppData/Roaming/npm/node_modules/playwright");

const ROOT = "C:/Users/Chady/Desktop/Phat Gym Track";
const TYPES = { ".html":"text/html", ".js":"application/javascript", ".css":"text/css",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg",   // B-103: the photographs
  ".webmanifest":"application/manifest+json", ".json":"application/json" };

// WO-009: the photo set is whatever the manifest says, never a number typed here.
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/ex/manifest.json"), "utf8"));
const PHOTO_PATHS = MANIFEST.files.map(f => "/" + f.path);
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/ex/map.json"), "utf8"));
const MAPPED = Object.keys(MAP).filter(k => k !== "_");

// WO-011 P1 (2026-09-13): the origin can change its mind between two
// navigations. OVERRIDE swaps the bytes served for a path (the "deploy"), HITS
// counts what the worker actually fetched. Both exist for section 9 - the test
// the v5 update bug would have failed.
const OVERRIDE = new Map();
const HITS = {};
const resetHits = () => { for (const k of Object.keys(HITS)) delete HITS[k]; };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  HITS[p] = (HITS[p] || 0) + 1;
  const f = path.join(ROOT, p);
  if (OVERRIDE.has(p)) {
    res.writeHead(200, {"content-type": TYPES[path.extname(p)] || "application/octet-stream"});
    return res.end(OVERRIDE.get(p));
  }
  if (!f.startsWith(path.resolve(ROOT)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404, {"content-type":"text/plain"}); return res.end("nope");
  }
  res.writeHead(200, {"content-type": TYPES[path.extname(f)] || "application/octet-stream"});
  res.end(fs.readFileSync(f));
});

await new Promise(r => server.listen(8787, r));
const ORIGIN = "http://127.0.0.1:8787";
const log = [];
const say = s => { log.push(s); console.log(s); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 400, height: 850 } });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
page.on("console", m => { if (m.type() === "error") errs.push("CONSOLE: " + m.text()); });

// 1. online load, let the SW install and take control
await page.goto(ORIGIN + "/index.html");
await page.waitForTimeout(1200);
const swState = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  if (!r) return "NO REGISTRATION";
  await navigator.serviceWorker.ready;
  return r.active ? "active" : (r.installing ? "installing" : "waiting");
});
say("1. service worker: " + swState);

const cached = await page.evaluate(async () => {
  const keys = await caches.keys();
  const out = {};
  for (const k of keys) out[k] = (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname);
  return out;
});
const cacheNames = Object.keys(cached);
const shellCache = cacheNames.find(k => k.indexOf("phat-shell-") === 0) || "";
const STAMP = "/__phat-refreshed";                       // v6: the throttle stamp, not a file
const hasStamp = (cached[shellCache] || []).includes(STAMP);
const held = new Set((cached[shellCache] || []).filter(p => p !== STAMP));
const photosHeld = PHOTO_PATHS.filter(p => held.has(p));
const photosMissing = PHOTO_PATHS.filter(p => !held.has(p));
say("2. caches: " + JSON.stringify(cacheNames) + " - " + shellCache + " holds " + held.size + " files" +
    (hasStamp ? " + the refresh stamp" : " and NO refresh stamp"));
say("   photos precached: " + photosHeld.length + "/" + PHOTO_PATHS.length +
    (photosMissing.length ? " MISSING: " + photosMissing.join(" ") : ""));

// dismiss onboarding so the day list is reachable
await page.evaluate(() => localStorage.setItem("phat:v1:prefs", JSON.stringify({ onboarded: true, restAuto: true })));

// 3. GO OFFLINE, then COLD reload
await ctx.setOffline(true);
say("3. network: OFFLINE");
await page.goto(ORIGIN + "/index.html", { waitUntil: "load" });
await page.waitForTimeout(1200);

const shell = await page.evaluate(() => ({
  tabs: [...document.querySelectorAll("[data-tab]")].map(b => b.textContent.trim()),
  days: [...document.querySelectorAll("[data-day]")].map(b => (b.innerText || "").split("\n")[0].trim()),
  hasPhat: typeof window.PHAT === "object" && !!window.PHAT.PHAT_PLAN,
  text: document.body.innerText.slice(0, 100).replace(/\n+/g, " | ")
}));
say("4. offline cold reload -> tabs: " + shell.tabs.join("/"));
say("   logic.js alive offline (window.PHAT.PHAT_PLAN): " + shell.hasPhat);
say("   day list: " + JSON.stringify(shell.days));

// 5. log a set, entirely offline
let logged = "NOT ATTEMPTED";
try {
  await page.click("[data-day]");
  await page.waitForTimeout(700);
  const inputs = await page.$$("#view input");
  if (inputs.length >= 2) {
    await inputs[0].fill("100");
    await inputs[1].fill("5");
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.waitForTimeout(700);
    const draft = await page.evaluate(() => localStorage.getItem("phat:v1:draft"));
    logged = draft && draft.indexOf("100") !== -1 ? "SET IN DRAFT ON DISK" : "draft missing the number: " + String(draft).slice(0, 200);
  } else {
    logged = "no inputs found on session screen (" + inputs.length + ")";
  }
} catch (e) { logged = "threw: " + e.message; }
say("5. log a set offline: " + logged);

// 6. reload AGAIN offline - does the number survive
await page.goto(ORIGIN + "/index.html", { waitUntil: "load" });
await page.waitForTimeout(1200);
const survived = await page.evaluate(() => {
  const d = localStorage.getItem("phat:v1:draft");
  return d && d.indexOf("100") !== -1;
});
say("6. number survives a second offline reload: " + survived);

// 7a. every photo FILE decodes offline, straight from the cache. This does
// not depend on which slots the reduced-volume tier shows (Rule V1 hides the
// cut accessories for weeks 1-4 of a fresh log, with no override), so it is
// the assertion that covers all 48 files, every run.
const decode = await page.evaluate(async (paths) => {
  const bad = [];
  for (const p of paths) {
    const ok = await new Promise(res => { const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false); im.src = p; });
    if (!ok) bad.push(p);
  }
  return bad;
}, PHOTO_PATHS);
say("7a. photo files decode offline from cache: " + (PHOTO_PATHS.length - decode.length) + "/" + PHOTO_PATHS.length +
    (decode.length ? " FAILED: " + decode.join(" ") : ""));

// 7b. every mapped slot's photographs, from cache, on a cold OFFLINE reload.
// The session screen shows ONE exercise at a time, so per day: start the
// day, then step with #navnext to the last exercise; on each, open the
// "movement & cue" disclosure, scroll it into view (the images are lazy) and
// require naturalWidth > 0 on every <img src="assets/ex/..."> in a MAPPED
// slot's box. Expected = 2 x (mapped slots seen), from map.json - not a number.
// THE DRAFT: the app writes phat:v1:draft on page hide, so a removeItem
// BEFORE a navigation is undone by the unload and the next boot offers the
// old draft (a day tap then opens the conflict sheet, not a session). Boot,
// clear, boot again. Test browser only - never the phone.
const photo = { expected: 0, imgs: 0, loaded: 0, broken: [], noBox: [], days: 0, seen: [] };
const dayIds = await page.evaluate(() => [...document.querySelectorAll(".daybtn[data-day]")].map(b => b.dataset.day));
for (const d of dayIds) {
  await page.goto(ORIGIN + "/index.html", { waitUntil: "load" });          // unload writes the last draft
  await page.evaluate(() => localStorage.removeItem("phat:v1:draft"));
  await page.goto(ORIGIN + "/index.html", { waitUntil: "load" });          // clean boot, no offer
  await page.waitForTimeout(500);
  const started = await page.evaluate((d) => { const b = document.querySelector(`.daybtn[data-day="${d}"]`); if (!b) return false; b.click(); return true; }, d);
  if (!started) continue;
  await page.waitForTimeout(500);
  photo.days++;
  for (let step = 0; step < 20; step++) {
    const r = await page.evaluate(async (mapped) => {
      const out = { expected: 0, imgs: 0, loaded: 0, broken: [], noBox: [], seen: [] };
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const b of document.querySelectorAll("[data-fig]")) {
        const id = b.dataset.fig;
        if (!mapped.includes(id)) continue;
        out.seen.push(id); out.expected += 2;
        if (b.getAttribute("aria-expanded") !== "true") b.click();
        const box = document.querySelector(`[data-figbox="${id}"]`);
        if (!box) { out.noBox.push(id); continue; }
        box.scrollIntoView({ block: "center" });
        const imgs = [...box.querySelectorAll('img[src*="assets/ex/"]')];
        if (!imgs.length) { out.noBox.push(id); continue; }
        for (const im of imgs) {
          out.imgs++;
          for (let t = 0; t < 40 && !(im.complete && im.naturalWidth > 0); t++) await sleep(50);
          if (im.naturalWidth > 0) out.loaded++; else out.broken.push(id + ":" + im.getAttribute("src"));
        }
      }
      return out;
    }, MAPPED);
    photo.expected += r.expected; photo.imgs += r.imgs; photo.loaded += r.loaded;
    photo.broken.push(...r.broken); photo.noBox.push(...r.noBox); photo.seen.push(...r.seen);
    const more = await page.evaluate(() => { const n = document.querySelector("#navnext"); if (!n || n.disabled) return false; n.click(); return true; });
    if (!more) break;
    await page.waitForTimeout(300);
  }
}
const unseen = MAPPED.filter(id => !photo.seen.includes(id));
say("7b. photos in slots offline: " + photo.loaded + " loaded of " + photo.imgs + " rendered, expected " +
    photo.expected + " (2 x " + (photo.expected / 2) + " mapped slots seen across " + photo.days + " days; map.json has " + MAPPED.length + ")" +
    (unseen.length ? " | not on screen (hidden by the reduced-volume tier on a fresh log, covered by 7a): " + unseen.join(" ") : "") +
    (photo.broken.length ? " BROKEN: " + photo.broken.join(" ") : "") +
    (photo.noBox.length ? " NO IMG IN BOX: " + photo.noBox.join(" ") : ""));
const photosOk = photosMissing.length === 0 && decode.length === 0 && photo.broken.length === 0 &&
                 photo.noBox.length === 0 && photo.imgs === photo.expected && photo.loaded === photo.expected && photo.expected > 0;

say("8. page errors: " + (errs.length ? errs.join(" | ") : "NONE"));

// 9. THE UPDATE PATH (WO-011 P1, 2026-09-13). The bug this would have caught:
// the phone had v4 active with the pre-WO-010 shell and never fetched the
// shell again, because the refresh was gated on a worker-lifetime variable
// and an iOS worker outlives launches. The contract sw.js v6 makes, asserted
// here against an origin that changes its mind between two navigations:
//   9a  the throttle is a stamp IN THE CACHE (aged by hand = "five minutes
//       later"; nothing in this run waits five minutes)
//   9b  N1 after the origin changed: the page gets the OLD shell, as one pair
//       (old index.html AND old logic.js), and the worker fetches the new
//       pair in the background - exactly one hit on each
//   9c  N2: the NEW shell, as one pair, from the cache, zero origin hits
//   9d  N3 within five minutes: zero origin hits, and the page is never
//       reloaded by anything but our own goto
//   9e  a new sw.js installs behind a page holding a draft and DOES NOT
//       activate (the page never posts phat-idle; nor does the zero-client
//       fallback fire, because this page is a client)
//   9f  phat-idle posted to registration.waiting -> it activates, the old
//       cache is gone, the page was not reloaded and the draft is still there
await ctx.setOffline(false);
say("9. network: ONLINE - the update path");
const upd = { ok: true, notes: [] };
const must = (cond, label) => { upd.notes.push((cond ? "ok   " : "FAIL ") + label); if (!cond) upd.ok = false; };
let mainNavs = 0;
page.on("framenavigated", f => { if (f === page.mainFrame()) mainNavs++; });

const indexSrc = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const logicSrc = fs.readFileSync(path.join(ROOT, "logic.js"), "utf8");
must(/<head>/i.test(indexSrc), "index.html has a <head> to mark");
OVERRIDE.set("/index.html", indexSrc.replace(/<head>/i, '<head><meta name="phat-marker" content="two">'));
OVERRIDE.set("/logic.js", logicSrc + "\nwindow.__PHAT_MARK = 'two';\n");

// 9a. the stamp exists from install, and is younger than five minutes. Age it.
const readStamp = () => page.evaluate(async ({ name, key }) => {
  const c = await caches.open(name); const h = await c.match(key);
  return h ? Number(await h.text()) : null;
}, { name: shellCache, key: STAMP });
const stampBefore = await readStamp();
must(stampBefore > 0 && Date.now() - stampBefore < 5 * 60 * 1000, "9a. install wrote a fresh stamp (" + stampBefore + ")");
await page.evaluate(async ({ name, key }) => { const c = await caches.open(name); await c.put(key, new Response("1")); }, { name: shellCache, key: STAMP });
say("   9a. stamp aged to epoch by hand - simulates five minutes elapsed");

const pairOf = () => page.evaluate(() => ({
  html: document.querySelector('meta[name="phat-marker"]') ? "two" : "one",
  js: window.__PHAT_MARK === "two" ? "two" : "one" }));
const cachedHtmlMarked = () => page.evaluate(async (name) => {
  const c = await caches.open(name); const h = await c.match("/index.html");
  return !!h && (await h.text()).includes('name="phat-marker"');
}, shellCache);

// 9b. N1
resetHits(); mainNavs = 0;
await page.goto(ORIGIN + "/index.html", { waitUntil: "load" });
const p1 = await pairOf();
await page.waitForTimeout(2500);                          // pair gate (<= 4 s) + fetch of both files
must(p1.html === "one" && p1.js === "one", "9b. N1 served the OLD shell as one pair (html " + p1.html + ", js " + p1.js + ")");
must((HITS["/index.html"] || 0) === 1 && (HITS["/logic.js"] || 0) === 1,
     "9b. N1 fetched the new pair from the origin exactly once each (index.html " + (HITS["/index.html"] || 0) + ", logic.js " + (HITS["/logic.js"] || 0) + ")");
must(await cachedHtmlMarked(), "9b. cache now holds the NEW index.html");
const stampAfter = await readStamp();
must(stampAfter > 1 && Date.now() - stampAfter < 60000, "9b. stamp rewritten on commit (" + stampAfter + ")");

// 9c. N2
resetHits();
await page.goto(ORIGIN + "/index.html", { waitUntil: "load" });
await page.waitForTimeout(1500);
const p2 = await pairOf();
must(p2.html === "two" && p2.js === "two", "9c. N2 served the NEW shell as one pair from cache (html " + p2.html + ", js " + p2.js + ")");
must((HITS["/index.html"] || 0) === 0 && (HITS["/logic.js"] || 0) === 0,
     "9c. N2 within five minutes: zero origin hits (index.html " + (HITS["/index.html"] || 0) + ", logic.js " + (HITS["/logic.js"] || 0) + ")");

// 9d. N3
resetHits();
await page.goto(ORIGIN + "/index.html", { waitUntil: "load" });
await page.evaluate(() => { window.__alive = 1; });
await page.waitForTimeout(2000);
const alive3 = await page.evaluate(() => window.__alive === 1);
must((HITS["/index.html"] || 0) === 0 && (HITS["/logic.js"] || 0) === 0, "9d. N3 within five minutes: zero origin hits");
must(alive3 && mainNavs === 3, "9d. three gotos, three navigations, no reload by the worker (navigations " + mainNavs + ", page alive " + alive3 + ")");

// 9e. a page holding a draft; a new sw.js installs and waits
await page.evaluate(() => localStorage.removeItem("phat:v1:draft"));
await page.goto(ORIGIN + "/index.html", { waitUntil: "load" });
await page.waitForTimeout(500);
let drafted = false;
try {
  await page.click("[data-day]"); await page.waitForTimeout(600);
  const ins = await page.$$("#view input");
  if (ins.length >= 2) { await ins[0].fill("100"); await ins[1].fill("5");
    await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.waitForTimeout(600);
    drafted = await page.evaluate(() => (localStorage.getItem("phat:v1:draft") || "").indexOf("100") !== -1); }
} catch (e) { upd.notes.push("draft threw: " + e.message); }
must(drafted, "9e. a draft with a number is open on the page");
await page.evaluate(() => { window.__alive = 2; });
const swSrc = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const swVer = (swSrc.match(/var VERSION = '([^']+)'/) || [])[1];
must(!!swVer, "9e. sw.js VERSION found (" + swVer + ")");
OVERRIDE.set("/sw.js", swSrc.replace(/var VERSION = '([^']+)'/, "var VERSION = '$1-t'"));
const waitState = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  await reg.update();
  for (let i = 0; i < 100; i++) { if (reg.waiting) break; await new Promise(r => setTimeout(r, 100)); }
  await new Promise(r => setTimeout(r, 2000));            // give a wrong skipWaiting time to show
  return { waiting: !!reg.waiting, active: !!reg.active, controller: !!navigator.serviceWorker.controller,
           caches: await caches.keys() };
});
must(waitState.waiting, "9e. the new worker is installed and WAITING (caches " + JSON.stringify(waitState.caches) + ")");
must(waitState.caches.includes(shellCache) && waitState.caches.includes(shellCache + "-t"),
     "9e. both caches exist: old still serving, new filled and not yet activated");

// 9f. phat-idle -> activation, no reload, draft intact
const idle = await page.evaluate(async (old) => {
  const reg = await navigator.serviceWorker.getRegistration();
  const changed = new Promise(r => navigator.serviceWorker.addEventListener("controllerchange", () => r(true), { once: true }));
  reg.waiting.postMessage({ type: "phat-idle" });
  const got = await Promise.race([changed, new Promise(r => setTimeout(() => r(false), 8000))]);
  // activate's sweep resolves before claim, but Chromium drops the old cache
  // from keys() only once the redundant worker releases its handle - measured
  // at 1-4 s. Poll, do not sample. Never caches.open() the old name here: that
  // would re-create it.
  let names = await caches.keys();
  for (let i = 0; i < 100 && names.includes(old); i++) { await new Promise(r => setTimeout(r, 100)); names = await caches.keys(); }
  return { changed: got, waiting: !!reg.waiting, caches: names, alive: window.__alive === 2,
           draft: (localStorage.getItem("phat:v1:draft") || "").indexOf("100") !== -1 };
}, shellCache);
must(idle.changed && !idle.waiting, "9f. phat-idle -> the waiting worker activated (controllerchange " + idle.changed + ")");
must(!idle.caches.includes(shellCache) && idle.caches.includes(shellCache + "-t"),
     "9f. old cache deleted, new cache in place (" + JSON.stringify(idle.caches) + ")");
must(idle.alive && idle.draft, "9f. no reload (page alive " + idle.alive + "), draft still on disk (" + idle.draft + ")");
OVERRIDE.clear();
for (const n of upd.notes) say("   " + n);
say("   update path: " + (upd.ok ? "PASS" : "FAIL"));

await page.screenshot({ path: "C:/Users/Chady/AppData/Local/Temp/claude/c--Users-Chady-Desktop-Phat-Gym-Track/f2ca77c4-8086-4da5-acfb-86e5a8a44ac1/scratchpad/offline-proof.png", fullPage: false });
await browser.close();
server.close();

const core = shell.hasPhat && shell.tabs.length === 5 && logged === "SET IN DRAFT ON DISK" && survived && errs.length === 0;
const pass = core && photosOk && upd.ok;
console.log("\n=== OFFLINE VERDICT: " + (pass ? "PASS" : "FAIL") +
  (core && !photosOk ? " (shell and logging pass; the photo assertion fails - until WO-009 W5 renders <img> for mapped slots this line is expected red)" : "") +
  (core && photosOk && !upd.ok ? " (offline passes; the UPDATE PATH fails - a deploy would not reach an installed phone)" : "") + " ===");
process.exit(pass ? 0 : 1);
