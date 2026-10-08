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
// either side of it. Run:
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
// B-173. THE UNDO THAT THE NEXT OPEN REVERSES.
//
// index.html:8342 is the first `del(PLANS)` this app has ever had - nothing
// before WO-023 removed phat:v1:plans. On the `rec.absent` branch (his device
// today: the active plan is a shipped template, so the key has never been
// written) the undo DELETES the key. del() is not save(), so it schedules no
// push, and nothing else writes a backed-up store before he closes the app.
//
// The server therefore keeps BOTH the copy's row AND
// user_state.plan_meta.activePlanId naming the copy. At the next open,
// storesOnDisk reports stores.plans === "absent", mergeOnOpen's `loc` passes
// `undefined`, and mergeStores' M11 rule takes the remote plan store WHOLE -
// activePlanId included. He is put on the copy, with the promoted slot back.
//
// Nothing is LOST (the keep list below holds no plan copy because there were
// no local plan bytes to keep). An explicit undo is silently reversed, and
// the plan every card reads next session changes. These cases FAIL on purpose
// until that is fixed; they are the reproduction, not a tolerance.
// ========================================================================
{
  const LOG1 = Object.assign({}, LOG0, { sessions: [
    { id: "s1", date: TODAY, dayId: "d1", planId: "phat", dateBasis: "local",
      entries: { d1a: { sets: [{ w: 100, r: 5 }], note: "", rx: { s: 3, lo: 3, hi: 5, k: "power" } } } }] });
  const served = wire(P.backupPayload(LOG1, BW0, storeA));   // the 2,000 ms push landed
  ok("B-173 a) the push published the copy and plan_meta.activePlanId = the copy",
     served.plans.length === 1 && served.user_state.plan_meta.activePlanId === copy.planId,
     served.user_state.plan_meta);

  // ...he taps Undo at ~3 s. del(PLANS), adoptPlans({}), no push. Next open:
  const mr = P.mergeStores({ log: LOG1, bw: BW0, plans: undefined }, served);
  ok("B-173 b) the merge runs and writes the plan store", mr.ok === true && mr.changed.plans === true,
     { reason: mr.reason, refused: mr.refused });
  ok("B-173 c) THE UNDONE SLOT IS NOT BACK IN A PLAN ON THIS DEVICE",
     !(mr.merged.plans.plans || []).some(p => p.planId === copy.planId),
     (mr.merged.plans.plans || []).map(p => p.planId));
  ok("B-173 d) AND HE IS NOT MOVED ONTO THE COPY HE UNDID",
     mr.merged.plans.activePlanId !== copy.planId, mr.merged.plans.activePlanId);

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
