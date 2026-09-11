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
  ".png":"image/png", ".webmanifest":"application/manifest+json", ".json":"application/json" };

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
say("2. caches: " + JSON.stringify(cached));

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

say("7. page errors: " + (errs.length ? errs.join(" | ") : "NONE"));

await page.screenshot({ path: "C:/Users/Chady/AppData/Local/Temp/claude/c--Users-Chady-Desktop-Phat-Gym-Track/f2ca77c4-8086-4da5-acfb-86e5a8a44ac1/scratchpad/offline-proof.png", fullPage: false });
await browser.close();
server.close();

const pass = shell.hasPhat && shell.tabs.length === 5 && logged === "SET IN DRAFT ON DISK" && survived && errs.length === 0;
console.log("\n=== OFFLINE VERDICT: " + (pass ? "PASS" : "FAIL") + " ===");
process.exit(pass ? 0 : 1);
