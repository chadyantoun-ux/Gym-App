// WO-023 C9. THE PLANS BACKUP ROUND TRIP, with no credential and no network.
//
// C9 was recorded as FAIL-not-run ("needs a signed-in account and a server
// stub; none built this pass"). This IS the server stub. It proves what the
// promote and the copy do to phat:v1:plans - a BACKED_UP store - on the way
// to Supabase and back.
//
// WHAT IS REAL HERE AND WHAT IS MODELLED. Everything on the client side is
// the shipped code: logic.js is loaded as the classic script it is, into a
// VM with a bare `window`, and backupPayload / restorePayload / pullPayload /
// mergeStores / validatePlan / editableTarget / promoteDraftEntry are the
// real functions. Two things are modelled, and only two, because a plan
// document meets nothing else between here and the row:
//
//   1. public.phat_plans_derive() - supabase/schema.sql section 8c. THREE
//      checks, transcribed verbatim below. There is no other server-side
//      validator for a plan: the plans table carries one constraint
//      (plans_user_plan_key unique), no CHECK on `doc`, and migrate-007-mv
//      touches only the SESSION validator. A plan is not held to
//      validateSessionDoc's SQL mirror and never was.
//   2. jsonb's canonical form. Postgres stores jsonb, not json, so an object
//      comes back with its keys sorted by (length, then bytewise) - the one
//      transformation a plan document undergoes server-side. Arrays keep
//      their order, which is why `days` and `ex` survive at all.
//
// So the request path (PostgREST, the real trigger, RLS) is NOT exercised
// here; that needs an account. What is exercised is every byte decision on
// either side of it.
//
// ONE EXCEPTION, in the B-173 block at the bottom: del(), backupSoon() and
// runBackup() live in index.html, which is not loaded, so that block
// hand-models the client's sequence - and then reads index.html AS TEXT to
// assert the shipped code still does what the model assumes (case g2). Read
// that block's own header before changing anything in it. Run:
//
//   "C:/Program Files/nodejs/node.exe" scripts/plan-backup-check.mjs
//
// Node is used because this is a verification script, not the app. The
// no-build constraint (CLAUDE.md section 3.1) is about what stands between
// his source and a logged set; nothing here ships.

import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const ROOT = process.argv[2] || "C:/Users/Chady/Desktop/Phat Gym Track";
const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "logic.js"), "utf8"), sandbox, { filename: "logic.js" });
const P = sandbox.window.PHAT;
if (!P) throw new Error("logic.js did not define window.PHAT");

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log("PASS  " + name); }
  else { fail++; console.log("FAIL  " + name + (extra !== undefined ? "  >> " + JSON.stringify(extra) : "")); }
};
const J = v => JSON.stringify(v);

// ---------------------------------------------------------------- the server

// supabase/schema.sql, public.phat_plans_derive(). Nothing added, nothing left
// out. If this function ever disagrees with the SQL, the SQL wins and this is
// the bug.
function phatPlansDerive(doc) {
  if (doc === null || typeof doc !== "object" || Array.isArray(doc))
    return { error: "plan doc must be a JSON object" };
  if (typeof doc.planId !== "string" || doc.planId.trim() === "")
    return { error: "plan.planId is required and must be a non-empty string" };
  if (Object.prototype.hasOwnProperty.call(doc, "days") && !Array.isArray(doc.days))
    return { error: "plan.days must be an array" };
  return { plan_id: doc.planId.trim() };
}

// jsonb. Keys sorted by length then bytes; arrays untouched.
function jsonb(v) {
  if (Array.isArray(v)) return v.map(jsonb);
  if (v && typeof v === "object") {
    const o = {};
    Object.keys(v).sort((a, b) => a.length !== b.length ? a.length - b.length : (a < b ? -1 : a > b ? 1 : 0))
      .forEach(k => { o[k] = jsonb(v[k]); });
    return o;
  }
  return v;
}

// The wire, in both directions: sync.js's push() row mapping, then the
// server, then pull()'s row shape. Throws on a refusal, the way a push fails.
function wire(payload) {
  const t = v => jsonb(JSON.parse(JSON.stringify(v)));
  const plans = (payload.plans || []).map(doc => {
    const d = phatPlansDerive(doc);
    if (d.error) throw new Error("server refused a plan: " + d.error);
    return { plan_id: d.plan_id, doc: t(doc) };
  });
  return {
    sessions: (payload.sessions || []).map(d => ({ client_id: String(d.id), local_date: d.date, doc: t(d) })),
    bodyweight: (payload.bodyweight || []).map(d => ({ local_date: d.date, doc: t(d) })),
    plans: plans,
    user_state: { log_meta: t(payload.logMeta || {}), plan_meta: t(payload.planMeta || {}) }
  };
}

// ------------------------------------------------------------- the two stores

const TODAY = "2026-10-08";
const LOG0 = { schemaVersion: P.SCHEMA_VERSION, includeCut: false, profile: null, sessions: [] };
const BW0 = { schemaVersion: P.SCHEMA_VERSION, entries: [] };
const HYP = { s: 3, lo: 10, hi: 12, k: "hyp", implement: "machine" };
const draftEntry = n => ({ n: n, sets: [{ w: "25", r: "12" }], note: "", mv: null });

// A: his device today - the active plan is the SHIPPED PHAT template, which is
// read-only, so the promote has to make a copy first.
const et = P.editableTarget({ schemaVersion: P.SCHEMA_VERSION, plans: [], activePlanId: "phat" }, TODAY);
ok("C9.1 editableTarget made a copy off the read-only active plan",
   et.ok === true && et.created === true, et.problems);
const copy = et.plan;
ok("C9.2 the copy is writable, re-minted, and declares its ancestor",
   copy.readOnly === false && copy.planId !== "phat" && copy.derivedFrom === "phat",
   { planId: copy.planId, readOnly: copy.readOnly, derivedFrom: copy.derivedFrom });
const idsOf = p => (p.days || []).map(d => d.id + ":" + (d.ex || []).map(e => e.id + "/" + e.lift).join(","));
ok("C9.3 every day id, exercise id and lift id is preserved by the copy",
   J(idsOf(copy)) === J(idsOf(P.shippedPlan("phat"))));
ok("C9.4 the copy validates locally", P.validatePlan(copy).ok === true, P.validatePlan(copy).problems);

const pr = P.promoteDraftEntry(copy, "d1", "x_kept1", draftEntry("Cable face pull"), HYP, null);
ok("C9.5 promoteDraftEntry appended the slot", pr.ok === true, pr.problems);
const promoted = pr.plan;
const slot = promoted.days.find(d => d.id === "d1").ex.slice(-1)[0];
ok("C9.6 the slot carries the draft entry's own id and a distinct lift id",
   slot.id === "x_kept1" && slot.lift !== "x_kept1" && String(slot.lift).trim() !== "");
ok("C9.7 the promoted plan validates locally", P.validatePlan(promoted).ok === true,
   P.validatePlan(promoted).problems);

const up = P.planStoreUpsert(et.store, promoted);
ok("C9.8 planStoreUpsert accepted it", up.ok === true, up.problems);
const storeA = up.store;
ok("C9.9 activePlanId points at the copy", storeA.activePlanId === copy.planId, storeA.activePlanId);

// B: the active plan is already a user plan, so the promote writes in place.
const storeB = { schemaVersion: P.SCHEMA_VERSION, plans: [JSON.parse(JSON.stringify(promoted))],
                 activePlanId: promoted.planId };
const etB = P.editableTarget(storeB, TODAY);
ok("C9.10 an editable active plan is the no-op case, the same object by identity",
   etB.ok === true && etB.created === false && etB.store === storeB && etB.plan === storeB.plans[0]);

// ------------------------------------------------- 1 and 2: push, then pull

const bp = P.backupPayload(LOG0, BW0, storeA);
ok("C9.11 backupPayload refused nothing and carries the plan",
   bp.blocked === null && bp.problems.length === 0 && bp.counts.plans === 1, bp.problems);
let rows = null, threw = null;
try { rows = wire(bp); } catch (e) { threw = e.message; }
ok("C9.12 phat_plans_derive accepted the document", threw === null, threw);

const rp = P.restorePayload(rows);
ok("C9.13 restorePayload accepted the whole payload", rp.ok === true, rp.problems);
const back = rp.plans.plans.find(p => p.planId === promoted.planId);
ok("C9.14 the plan came back", !!back);
ok("C9.15 it is identical to what was pushed (stableJson, key-order blind)",
   P.stableJson(back) === P.stableJson(promoted));
ok("C9.16 the promoted slot came back field for field",
   P.stableJson(back.days.find(d => d.id === "d1").ex.slice(-1)[0]) === P.stableJson(slot));
ok("C9.17 readOnly, derivedFrom, from and createdAt survived",
   back.readOnly === false && back.derivedFrom === "phat" &&
   back.from === promoted.from && back.createdAt === promoted.createdAt,
   { readOnly: back.readOnly, derivedFrom: back.derivedFrom, createdAt: back.createdAt });
ok("C9.18 it still validates after the round trip", P.validatePlan(back).ok === true,
   P.validatePlan(back).problems);
ok("C9.19 activePlanId survived in plan_meta", rp.plans.activePlanId === copy.planId, rp.plans.activePlanId);
ok("C9.20 normalisePlanStore repaired nothing - no repair was owed",
   rp.notes.filter(n => /plan store normalised/.test(n)).length === 0, rp.notes);

const pp = P.pullPayload(rows);
ok("C9.21 pullPayload refused no plan row",
   pp.refused.filter(r => r.kind === "plan").length === 0 && pp.counts.plans === 1, pp.refused);
ok("C9.22 pullPayload's plan is identical too",
   P.stableJson(pp.plans.plans.find(p => p.planId === promoted.planId)) === P.stableJson(promoted));
ok("C9.23 backupSig is unchanged by the round trip - a pull provokes no push",
   P.backupSig(P.backupPayload(LOG0, BW0, storeA)) === P.backupSig(P.backupPayload(rp.log, rp.bw, rp.plans)));

// A session logged on the promoted slot, pushed beside its plan.
{
  const sess = { id: "s1", date: TODAY, dayId: "d1", planId: copy.planId, dateBasis: "local",
                 entries: { x_kept1: { sets: [{ w: 25, r: 12 }], note: "", rx: { s: 3, lo: 10, hi: 12, k: "hyp" } } } };
  const b = P.backupPayload(Object.assign({}, LOG0, { sessions: [sess] }), BW0, storeA);
  ok("C9.24 a session on the promoted slot pushes with its plan",
     b.problems.length === 0 && b.counts.sessions === 1 && b.counts.plans === 1, b.problems);
  let t = null, r2 = null;
  try { r2 = wire(b); } catch (e) { t = e.message; }
  ok("C9.25 the server accepts session and plan in one push", t === null, t);
  const back2 = P.restorePayload(r2);
  ok("C9.26 both come back and the slot resolves by id",
     back2.ok === true && !!P.resolveEx([back2.plans.plans[0]], "x_kept1"), back2.problems);
}

// --------------------- 4: the same planId on two devices, different `days`

{
  const local = JSON.parse(JSON.stringify(promoted));
  const pr2 = P.promoteDraftEntry(local, "d1", "x_kept2", draftEntry("Rope pushdown"), HYP, null);
  ok("C9.27 a second promote on this device's copy succeeded", pr2.ok === true, pr2.problems);
  const localStore = { schemaVersion: P.SCHEMA_VERSION, plans: [pr2.plan], activePlanId: pr2.plan.planId };
  const localRef = localStore.plans[0];
  const mr = P.mergeStores({ log: LOG0, bw: BW0, plans: localStore }, rows);
  ok("C9.28 the merge is ok and refused nothing", mr.ok === true && mr.refused.length === 0,
     { reason: mr.reason, refused: mr.refused });
  ok("C9.29 same planId, different days: kept, not added",
     mr.kept.plans === 1 && mr.added.plans === 0, { kept: mr.kept.plans, added: mr.added.plans });
  ok("C9.30 the difference is disclosed in kept.differ",
     J(mr.kept.differ.plans) === J([promoted.planId]), mr.kept.differ.plans);
  const held = mr.merged.plans.plans.find(p => p.planId === promoted.planId);
  ok("C9.31 the local document wins BY REFERENCE - byte-for-byte by identity", held === localRef);
  ok("C9.32 both promoted slots stand; the server's copy overwrote neither",
     held.days.find(d => d.id === "d1").ex.slice(-2).map(e => e.id).join(",") === "x_kept1,x_kept2");
  ok("C9.33 nothing was removed by the pull", mr.merged.plans.plans.length >= localStore.plans.length);
  ok("C9.34 activePlanId stays the phone's", mr.merged.plans.activePlanId === localStore.activePlanId);
  const bp2 = P.backupPayload(mr.merged.log, mr.merged.bw, mr.merged.plans);
  ok("C9.35 the merged store pushes again with no problem",
     bp2.blocked === null && bp2.problems.length === 0, bp2.problems);
  let t = null; try { wire(bp2); } catch (e) { t = e.message; }
  ok("C9.36 and the server accepts the merged document", t === null, t);
}

// B-121's accepted class, confirmed: a copy arriving from the other device
// becomes a row, and does NOT become the plan he is on.
{
  const mr = P.mergeStores({ log: LOG0, bw: BW0,
    plans: { schemaVersion: P.SCHEMA_VERSION, plans: [], activePlanId: "phat" } }, rows);
  ok("C9.37 a copy the phone has never seen is ADDED by the pull",
     mr.ok === true && mr.added.plans === 1, { ok: mr.ok, added: mr.added.plans, refused: mr.refused });
  ok("C9.38 and activePlanId is NOT moved onto it - B-121's accepted end state",
     mr.merged.plans.activePlanId === "phat", mr.merged.plans.activePlanId);
  ok("C9.39 the arrived copy validates as it would be written to disk",
     P.validatePlan(mr.merged.plans.plans[0]).ok === true,
     P.validatePlan(mr.merged.plans.plans[0]).problems);
}

// The draft mark cannot reach the server, by construction (phat:v1:draft is
// not in BACKED_UP). Asserted here too so a future payload change trips it.
ok("C9.40 the `kp` mark appears in no payload backupPayload builds",
   !/"kp"/.test(JSON.stringify(P.backupPayload(LOG0, BW0, storeA))));

// ========================================================================
// B-173, FOUND HERE AND NOW FIXED (c76e47d, one line in keepUndoTap).
//
// THE DEFECT. index.html's keepUndoTap holds the first `del(PLANS)` this app
// has ever had - nothing before WO-023 removed phat:v1:plans. On the
// `rec.absent` branch (his device today: the active plan is a shipped
// template, so the key has never been written) the undo DELETES the key, and
// del() is not save(): it scheduled no push, and nothing else writes a
// backed-up store before he closes the app. The server therefore kept BOTH
// the copy's row AND user_state.plan_meta.activePlanId naming the copy. At
// the next open storesOnDisk reports stores.plans === "absent", mergeOnOpen
// passes `loc.plans === undefined`, and mergeStores' M11 - an absent local
// store takes the remote store WHOLE - put him back on the copy with the
// promoted slot in it. Nothing was LOST; an explicit undo was silently
// reversed, which is worse in a different way: every card reads that plan.
//
// THE FIX. The undo schedules its own push:
//     if(ok){ adoptPlans({}); backupSoon(PLANS); }
// With the key gone, runBackup's load(PLANS) returns null, backupPayload
// builds planMeta {} and plans [], and sync.js upserts user_state with
// plan_meta = {}. activePlanId is blanked on the server, so the next open's
// M11 has nothing to move him onto.
//
// WHY c) DOES NOT ASSERT THE ROW IS GONE. The push is upsert-only; sync.js
// deletes nothing, and nothing in this app can delete a server row at all -
// that gap is B-98, still open. So the copy's ROW survives the undo, and the
// end state is B-121's already-accepted one: the copy appears in Plans, he is
// not on it. The only thing the undo owes him is that the plan his cards read
// tomorrow is the plan he undid back to. That is what c) asserts, and d2)
// pins the surviving row deliberately so nobody later reads it as a
// regression and "fixes" it into a delete.
//
// WHAT THIS HARNESS CAN AND CANNOT SEE. Only logic.js is loaded here; del(),
// backupSoon() and runBackup() live in index.html, so the client sequence
// below is hand-modelled. g) is the behavioural control - fed the PRE-FIX
// server state, the same real mergeStores still puts him on the copy, which
// is what makes c) and d) load-bearing rather than vacuous. But g) cannot go
// red if that one line is reverted, because no behaviour here depends on
// index.html. g2) is what does: it reads index.html and requires the
// `rec.absent` branch to actually schedule the push this model assumes.
// Comments are stripped before it matches, so the comment beside the fix
// cannot keep it green on its own.
// ========================================================================
{
  const LOG1 = Object.assign({}, LOG0, { sessions: [
    { id: "s1", date: TODAY, dayId: "d1", planId: "phat", dateBasis: "local",
      entries: { d1a: { sets: [{ w: 100, r: 5 }], note: "", rx: { s: 3, lo: 3, hi: 5, k: "power" } } } }] });

  // index.html:1239 activePlanOf, transcribed: a SHIPPED id resolves to code
  // AHEAD of the store (WO-018 T3), then the store, then the template.
  const activePlan = store => {
    const id = String((store && store.activePlanId) || P.PHAT_PLAN_ID);
    const sh = P.shippedPlan(id);
    if (sh) return sh;
    const hit = ((store && store.plans) || []).find(p => p && p.planId === id);
    if (!hit) return P.PHAT_PLAN;
    return P.validatePlan(hit).ok === true ? hit : P.PHAT_PLAN;
  };
  const holdsPromoted = plan => (plan.days || []).some(d => (d.ex || []).some(e => e.id === "x_kept1"));

  const served = wire(P.backupPayload(LOG1, BW0, storeA));   // the 2,000 ms push landed
  ok("B-173 a) the push published the copy and plan_meta.activePlanId = the copy",
     served.plans.length === 1 && served.user_state.plan_meta.activePlanId === copy.planId,
     served.user_state.plan_meta);

  // ...he taps Undo at ~3 s: del(PLANS), adoptPlans({}), AND backupSoon(PLANS).
  // Two seconds later runBackup reads a null plans store and pushes planMeta {}.
  const undone = wire(P.backupPayload(LOG1, BW0, null));
  ok("B-173 a2) the undo's push carries no plan and a BLANK plan_meta",
     undone.plans.length === 0 && J(undone.user_state.plan_meta) === "{}", undone.user_state.plan_meta);
  // And it is not swallowed by runBackup's "nothing changed since the last
  // backup" guard, which returns early on an equal sig for an auto push.
  ok("B-173 a3) the undo's payload has a different backupSig, so the auto push is not suppressed",
     P.backupSig(P.backupPayload(LOG1, BW0, storeA)) !== P.backupSig(P.backupPayload(LOG1, BW0, null)));
  // The server after the undo: rows upserted and never deleted, user_state replaced.
  const served2 = { sessions: served.sessions, bodyweight: served.bodyweight,
                    plans: served.plans, user_state: undone.user_state };

  const mr = P.mergeStores({ log: LOG1, bw: BW0, plans: undefined }, served2);
  ok("B-173 b) the merge runs and writes the plan store", mr.ok === true && mr.changed.plans === true,
     { reason: mr.reason, refused: mr.refused });
  const act = activePlan(mr.merged.plans);
  ok("B-173 c) THE PLAN HIS CARDS READ TOMORROW HOLDS NO PROMOTED SLOT",
     !!act && !holdsPromoted(act),
     act ? { planId: act.planId, d1: (act.days || []).map(d => d.id + ":" + (d.ex || []).map(e => e.id).join(",")) } : null);
  ok("B-173 d) AND HE IS NOT MOVED ONTO THE COPY HE UNDID - he is on the template",
     mr.merged.plans.activePlanId !== copy.planId && mr.merged.plans.activePlanId === P.PHAT_PLAN_ID,
     mr.merged.plans.activePlanId);
  ok("B-173 d2) the copy is still a ROW - B-121's accepted end state, and B-98 is " +
     "why no undo can remove it; not a regression",
     (mr.merged.plans.plans || []).length === 1 && mr.merged.plans.plans[0].planId === copy.planId,
     (mr.merged.plans.plans || []).map(p => p.planId));
  ok("B-173 d3) the undo really undid it - a later promote must copy the template again",
     (() => { const e2 = P.editableTarget(mr.merged.plans, TODAY);
              return e2.ok === true && e2.created === true && e2.plan.derivedFrom === "phat" &&
                     e2.plan.planId !== copy.planId; })());

  // The earlier window closes for free: an undo INSIDE 2 s resets bkTimer, so
  // the commit's push never runs and the copy never reaches the server at all.
  {
    const only = wire(P.backupPayload(LOG1, BW0, null));
    const mrE = P.mergeStores({ log: LOG1, bw: BW0, plans: undefined }, only);
    ok("B-173 f) undo inside 2 s: no plan row is ever created and the next open adopts nothing",
       only.plans.length === 0 && mrE.ok === true && mrE.changed.plans === false &&
       mrE.merged.plans === undefined, { changed: mrE.changed.plans, plans: mrE.merged.plans });
  }

  // The PRE-FIX control. Same real mergeStores, fed the server state an undo
  // that pushed nothing leaves behind: the defect reproduces exactly.
  {
    const mrP = P.mergeStores({ log: LOG1, bw: BW0, plans: undefined }, served);
    const actP = activePlan(mrP.merged.plans);
    ok("B-173 g) CONTROL - with no push after del(PLANS) he IS put back on the copy, " +
       "promoted slot and all",
       mrP.merged.plans.activePlanId === copy.planId && holdsPromoted(actP),
       mrP.merged.plans.activePlanId);
  }

  // ...and the tripwire that ties the model above to the shipped client, so
  // reverting the one line of c76e47d goes red HERE and not only on his phone.
  {
    const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const bare = src.replace(/\/\*[\s\S]*?\*\//g, " ");
    const i = bare.indexOf("async function keepUndoTap");
    const fn = i < 0 ? "" : bare.slice(i, bare.indexOf("\n}", i) + 1);
    const a = fn.indexOf("rec.absent");
    const branch = a < 0 ? "" : fn.slice(a, (() => { const e = fn.indexOf("else", a); return e < 0 ? fn.length : e; })());
    ok("B-173 g2) the shipped undo really schedules the push this model assumes " +
       "(revert that line and this goes red)",
       /\bdel\(\s*PLANS\s*\)/.test(branch) && /\bbackupSoon\(\s*PLANS\s*\)/.test(branch),
       branch.replace(/\s+/g, " ").trim().slice(0, 180));
  }

  const st = P.mergeSteps(mr, { empty: false, kept: false, log: LOG1, bw: BW0, plans: undefined, blocked: {} },
                          { log: "phat:v1:log", bw: "phat:v1:bw", plans: "phat:v1:plans" }, 1760000000000);
  ok("B-173 e) no plan bytes are destroyed - the keeps hold log and bw only, and " +
     "there were no local plan bytes to keep (this is not a data-loss path)",
     st.ok === true && !st.keeps.some(k => /recover:plans/.test(k.key)),
     st.ok ? st.keeps.map(k => k.key) : st.message);
  console.log("      writes: " + J(st.writes.map(w => w.key)) + "   keeps: " + J(st.keeps.map(k => k.key)));
}

console.log("\n" + pass + " / " + (pass + fail) + " / " + fail);
process.exit(fail ? 1 : 0);
