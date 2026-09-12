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

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
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
const held = new Set(cached[shellCache] || []);
const photosHeld = PHOTO_PATHS.filter(p => held.has(p));
const photosMissing = PHOTO_PATHS.filter(p => !held.has(p));
say("2. caches: " + JSON.stringify(cacheNames) + " - " + shellCache + " holds " + held.size + " entries");
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

await page.screenshot({ path: "C:/Users/Chady/AppData/Local/Temp/claude/c--Users-Chady-Desktop-Phat-Gym-Track/f2ca77c4-8086-4da5-acfb-86e5a8a44ac1/scratchpad/offline-proof.png", fullPage: false });
await browser.close();
server.close();

const core = shell.hasPhat && shell.tabs.length === 5 && logged === "SET IN DRAFT ON DISK" && survived && errs.length === 0;
const pass = core && photosOk;
console.log("\n=== OFFLINE VERDICT: " + (pass ? "PASS" : "FAIL") +
  (core && !photosOk ? " (shell and logging pass; the photo assertion fails - until WO-009 W5 renders <img> for mapped slots this line is expected red)" : "") + " ===");
process.exit(pass ? 0 : 1);
