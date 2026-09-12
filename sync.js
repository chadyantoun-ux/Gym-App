/* PHAT Log - backup client.  E-3.
   ---------------------------------------------------------------------------
   ES MODULE, and the only one in the app. index.html injects it as
   <script type="module" src="./sync.js"> AFTER the app has booted and
   rendered, and only when the page is on http(s) and navigator.onLine is not
   false. If this file or the CDN import below fails to load, the script
   element's `error` event fires, window.PHAT_SYNC is never defined, and the
   app is exactly what it was before this file existed: a complete offline
   logger against localStorage. Nothing here is a dependency of logging.

   WHAT IT IS: backup and restore. Not sync. Push-only - the device writes to
   Supabase; the server never writes back except on an explicit Restore tap
   in Settings (supabase/README.md §6.1, adopted). One writer, so there is no
   conflict to resolve, and the unique keys in schema.sql make every push
   idempotent: pushing the same log twice produces the same remote state and
   an empty `conflicts` table.

   WHAT IT NEVER DOES:
     - read or write phat:v1:* - the app owns its stores and hands this module
       a payload already built by PHAT.backupPayload (logic.js), and takes
       pulled rows back through PHAT.restorePayload before anything touches
       disk. This file cannot name a store key and does not try.
     - sit in the save path. push() is called by the app AFTER its local write
       has completed and been confirmed, on a debounce, from a timer. A failed
       push changes nothing locally and is reported as a failed BACKUP, never
       as a failed save (CLAUDE.md §3.2, B-16).
     - render. It returns results and notifies subscribers; index.html decides
       what a screen says.
     - hold the server-side key (the one the dashboard hides behind Reveal,
       which bypasses RLS). The two constants below are the project URL
       and the PUBLISHABLE key, which is designed to ship in client code and is
       safe only because every table is behind RLS scoped to auth.uid()
       (supabase/rls.sql, verified applied 2026-09-11).

   AUTH is email + password, persisted by supabase-js in localStorage under
   AUTH_KEY - deliberately not a phat:v1:* key, so the storage adapter's
   own keys, the recover: copies and the migration never see it. Magic links
   are not offered: a link opened from an email lands in the browser, not the
   installed PWA, and the session would be in the wrong context. A signed-in
   user can set her own password (changePassword, WO-009 W8); there is no
   reset for a forgotten one.

   VERSION PIN: the CDN import is an exact version, never @2. A moving tag is a
   dependency that can change under an installed app with no deploy. */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";

const PROJECT_URL = "https://nkebsoqjtkcdiswrmely.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_nt0jLWZQoPSCQQrw0jkiDg_OZs4iKOZ";
const AUTH_KEY     = "phat:auth";          /* supabase-js session; NOT phat:v1:* */
const LIB_VERSION  = "2.116.0";
const CHUNK        = 50;                   /* rows per upsert request */
const PAGE         = 1000;                 /* PostgREST's default max rows */

const client = createClient(PROJECT_URL, PUBLISHABLE_KEY, {
  auth: {
    storageKey: AUTH_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,             /* no magic links; the URL is never touched */
    flowType: "implicit"
  }
});

/* ------------------------------------------------------------- state */

const st = { user: null, busy: null };     /* busy: null | "push" | "pull" | "auth" */
const subs = [];

function userOf(session) {
  const u = session && session.user;
  return u ? { id: u.id, email: u.email || "" } : null;
}
function snapshot() { return { user: st.user, busy: st.busy, lib: LIB_VERSION }; }
function emit() {
  const s = snapshot();
  subs.forEach(fn => { try { fn(s); } catch (_e) { /* a subscriber's bug is not ours */ } });
}
function subscribe(fn) {
  if (typeof fn === "function" && subs.indexOf(fn) < 0) subs.push(fn);
  return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
}

/* Two guards decide whether an auth event is a USER CHANGE the app must hear
   about (index.html's onSync wipes S.sync.last and the owner refusal on a
   change of user id, and repaints the owner row):
     1. USER_UPDATED is gated by name. The library fires it from inside
        updateUser() - after changePassword() below - with the SAME session
        and the SAME user id. It is a password change, not a user change:
        nothing is emitted, st.user is not reassigned, no subscriber runs, so
        S.sync.last survives, no push is scheduled and the owner row is not
        repainted as a different account (WO-009 W8). The gate holds only
        while the id matches; an id that differs (which updateUser cannot
        produce) falls through to the general path rather than being hidden.
     2. Everything else - SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED,
        INITIAL_SESSION - emits only when {id, email} actually differs, so a
        token refresh on the same account is silent too. */
client.auth.onAuthStateChange((event, session) => {
  const next = userOf(session);
  if (event === "USER_UPDATED" && next && st.user && next.id === st.user.id) return;
  const changed = JSON.stringify(next) !== JSON.stringify(st.user);
  st.user = next;
  if (changed) emit();
});

/* ready() resolves once the persisted session (if any) has been read, so the
   caller knows whether it is signed in before it paints Settings or decides
   on the open-time push. Never rejects. */
async function ready() {
  try {
    const { data } = await client.auth.getSession();
    st.user = userOf(data && data.session);
  } catch (_e) { st.user = null; }
  return snapshot();
}

/* ------------------------------------------------------------ errors */

/* One shape for every failure: { ok:false, reason, message }.
     offline    no connection, or the request never reached the server - retry later
     rejected   the server refused the DATA (SQLSTATE 23514 from schema.sql's
                validators, or a check constraint). Retrying will not help;
                the message names the entry. Never dropped, never coerced.
     auth       not signed in, or the session is no longer valid
     busy       another push or pull is running
     error      anything else, with the server's own words */
function offline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
function classify(err, fallback) {
  const msg = String((err && (err.message || err.error_description)) || err || fallback || "unknown error");
  const code = err && err.code !== undefined ? String(err.code) : "";
  const status = err && typeof err.status === "number" ? err.status : 0;
  if (offline() || /failed to fetch|networkerror|load failed|network request failed|fetch failed|err_internet|abort/i.test(msg))
    return { ok: false, reason: "offline", message: "No connection." };
  if (code === "23514" || code === "23502" || code === "23503" || code === "22P02")
    return { ok: false, reason: "rejected", message: msg.replace(/^phat:\s*/, "") };
  if (code === "42501" || code === "PGRST301" || status === 401 || status === 403 || /jwt|not authenticated|no authenticated user/i.test(msg))
    return { ok: false, reason: "auth", message: "Sign in again." };
  return { ok: false, reason: "error", message: msg };
}

/* -------------------------------------------------------------- auth */

/* authMessage(err, fallback) → one house-voice sentence for an auth error.
   Matches on the server's message AND on the library's error code
   (AuthApiError.code carries GoTrue's `error_code`, e.g. `same_password`),
   so a reworded message still maps. `fallback` is the sentence for an error
   with no words at all; sign-in and sign-up keep the old default. */
function authMessage(err, fallback) {
  const obj = !!err && typeof err === "object";
  const msg = String((obj ? err.message : err) || "");   /* an object with no message is "", never "[object Object]" */
  const code = obj && err.code ? String(err.code) : "";
  const t = code + " " + msg;
  if (offline() || /failed to fetch|networkerror|load failed|fetch failed/i.test(t)) return "No connection.";
  if (/invalid login credentials|invalid_credentials/i.test(t)) return "Wrong email or password.";
  if (/already registered|already exists/i.test(t)) return "That email already has an account. Sign in instead.";
  if (/signups? not allowed|signup_disabled/i.test(t)) return "New accounts are switched off.";
  if (/password should be at least|weak_password/i.test(t)) return "Password needs at least 6 characters.";
  /* changePassword only. GoTrue: 422 `same_password` "New password should be
     different from the old password." */
  if (/different from the old password|same_password/i.test(t)) return "That is already your password.";
  /* changePassword only, and only when the project's Secure password change
     setting is on (supabase/README.md §4.1): 422 `reauthentication_needed`
     "Password update requires reauthentication." A fresh sign-in is a new
     session, which is what the server is asking for. */
  if (/requires reauthentication|reauthentication_needed/i.test(t)) return "Sign out and sign in again, then retry.";
  if (/unable to validate email|invalid email|validation_failed/i.test(t)) return "That is not an email address.";
  if (/rate limit|too many requests|over_email_send_rate_limit/i.test(t)) return "Too many attempts. Wait a minute.";
  return msg || fallback || "Could not sign in.";
}

async function runAuth(fn) {
  if (st.busy) return { ok: false, reason: "busy", message: "Wait for the current backup to finish." };
  st.busy = "auth"; emit();
  try {
    const { data, error } = await fn();
    if (error) return { ok: false, reason: "auth", message: authMessage(error) };
    /* A sign-up with confirmation on returns a user and NO session. This
       project has autoconfirm on, so a missing session is reported rather
       than treated as signed in. */
    if (!data || !data.session) return { ok: false, reason: "auth", message: "Account created but not signed in. Sign in." };
    st.user = userOf(data.session);
    return { ok: true, user: st.user };
  } catch (err) {
    return { ok: false, reason: "auth", message: authMessage(err) };
  } finally { st.busy = null; emit(); }
}

function signIn(email, password) {
  return runAuth(() => client.auth.signInWithPassword({ email: String(email || "").trim(), password: String(password || "") }));
}
function signUp(email, password) {
  return runAuth(() => client.auth.signUp({ email: String(email || "").trim(), password: String(password || "") }));
}

/* Sign-out clears the auth session and nothing else: this file cannot reach
   the log. scope:"local" so the server-side revoke of OTHER devices is not
   attempted. If the server cannot be reached the library keeps the local
   session and returns an error, which is reported honestly. */
async function signOut() {
  if (st.busy) return { ok: false, reason: "busy", message: "Wait for the current backup to finish." };
  st.busy = "auth"; emit();
  try {
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return classify(error, "Could not sign out.");
    st.user = null;
    return { ok: true };
  } catch (err) {
    return classify(err, "Could not sign out.");
  } finally { st.busy = null; emit(); }
}

/* changePassword(newPassword) → { ok:true } | { ok:false, reason, message }
   WO-009 W8 (B-102). Sets the signed-in user's own password; the account
   whose password was generated for her gets to choose one. The order of the
   refusals is the order of what is cheapest to know, and every refusal
   before `busy` is taken is decided on this device with NO request sent:
     signed out   { reason:"auth",    message:"Sign in first." }
     offline      { reason:"offline", message:"No connection." }
     under 6      { reason:"auth",    message:"Password needs at least 6 characters." }
                  - the server's own floor, refused here so a too-short
                    password never leaves the phone
     busy         { reason:"busy",    message:"Wait for the current backup to finish." }
   Then client.auth.updateUser({ password }) under the same busy handling as
   runAuth. It answers { data:{user}, error } with NO session, so runAuth's
   "no session means not signed in" rule does not apply and it is not used.
   The library fires USER_UPDATED from inside the call; onAuthStateChange
   above swallows it, so st.user is untouched, no subscriber hears a user
   change and nothing downstream is wiped or scheduled. st.user is not
   reassigned here either: it is the same id and the same email.
   The two errors this call can add are mapped in authMessage: same as the
   old password, and - only if Secure password change is on in the project
   (supabase/README.md §4.1) - reauthentication required. Not a store, not a
   push, not a pull: push()/pull() are not touched by a change of password. */
async function changePassword(newPassword) {
  if (!st.user) return { ok: false, reason: "auth", message: "Sign in first." };
  if (offline()) return { ok: false, reason: "offline", message: "No connection." };
  const password = String(newPassword || "");
  if (password.length < 6) return { ok: false, reason: "auth", message: "Password needs at least 6 characters." };
  if (st.busy) return { ok: false, reason: "busy", message: "Wait for the current backup to finish." };
  st.busy = "auth"; emit();
  try {
    const { error } = await client.auth.updateUser({ password });
    if (error) return { ok: false, reason: "auth", message: authMessage(error, "Could not change the password.") };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: "auth", message: authMessage(err, "Could not change the password.") };
  } finally { st.busy = null; emit(); }
}

/* -------------------------------------------------------------- push */

async function upsertChunks(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await client.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) return error;
  }
  return null;
}

/* push(payload) → { ok:true, at, counts } | { ok:false, reason, message }
   `payload` is PHAT.backupPayload's output: the documents to send, already
   validated, plus logMeta / planMeta. Everything is an upsert on the unique
   key schema.sql declares, so a retry after a timeout that actually landed
   updates rows rather than duplicating them, and an unchanged document does
   not even reach the conflicts archive (the trigger compares old.doc to
   new.doc). Order: sessions, bodyweight, plans, user_state - the state row
   last, so a run that dies half way leaves the previous state row standing
   over whatever sessions did land, and the next push repairs it.
   The derived columns (client_id, local_date, day_id, plan_id, kg) are set
   by the server from the document; client_id is sent as well only so the
   ON CONFLICT target is present in the request. */
async function push(payload) {
  if (!st.user) return { ok: false, reason: "auth", message: "Not signed in." };
  if (offline()) return { ok: false, reason: "offline", message: "No connection." };
  if (st.busy) return { ok: false, reason: "busy", message: "A backup is already running." };
  if (!payload || !Array.isArray(payload.sessions) || !Array.isArray(payload.bodyweight))
    return { ok: false, reason: "error", message: "Nothing to back up: bad payload." };
  st.busy = "push"; emit();
  try {
    const uid = st.user.id;
    let err;
    err = await upsertChunks("sessions",
      payload.sessions.map(doc => ({ user_id: uid, client_id: String(doc.id), doc })),
      "user_id,client_id");
    if (err) return classify(err, "Could not back up sessions.");
    err = await upsertChunks("bodyweight",
      payload.bodyweight.map(doc => ({ user_id: uid, local_date: doc.date, doc })),
      "user_id,local_date");
    if (err) return classify(err, "Could not back up bodyweight.");
    err = await upsertChunks("plans",
      (payload.plans || []).map(doc => ({ user_id: uid, plan_id: String(doc.planId), doc })),
      "user_id,plan_id");
    if (err) return classify(err, "Could not back up plans.");
    err = await upsertChunks("user_state",
      [{ user_id: uid, log_meta: payload.logMeta || {}, plan_meta: payload.planMeta || {} }],
      "user_id");
    if (err) return classify(err, "Could not back up settings.");
    return { ok: true, at: Date.now(), counts: payload.counts || null };
  } catch (err) {
    return classify(err, "Backup failed.");
  } finally { st.busy = null; emit(); }
}

/* -------------------------------------------------------------- pull */

async function selectAll(table, columns, order) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = client.from(table).select(columns).is("deleted_at", null).range(from, from + PAGE - 1);
    order.forEach(o => { q = q.order(o); });
    const { data, error } = await q;
    if (error) return { error };
    (data || []).forEach(r => out.push(r));
    if (!data || data.length < PAGE) break;
  }
  return { rows: out };
}

/* pull() → { ok:true, rows:{ sessions, bodyweight, plans, user_state } }
                 | { ok:false, reason, message }
   Reads every live (not soft-deleted) row for the signed-in user. Nothing is
   written anywhere; the caller hands `rows` to PHAT.restorePayload and asks
   before any of it reaches disk. */
async function pull() {
  if (!st.user) return { ok: false, reason: "auth", message: "Not signed in." };
  if (offline()) return { ok: false, reason: "offline", message: "No connection." };
  if (st.busy) return { ok: false, reason: "busy", message: "A backup is already running." };
  st.busy = "pull"; emit();
  try {
    const s = await selectAll("sessions", "client_id,local_date,doc", ["local_date", "client_id"]);
    if (s.error) return classify(s.error, "Could not read the backup.");
    const b = await selectAll("bodyweight", "local_date,doc", ["local_date"]);
    if (b.error) return classify(b.error, "Could not read the backup.");
    const p = await selectAll("plans", "plan_id,doc", ["plan_id"]);
    if (p.error) return classify(p.error, "Could not read the backup.");
    const u = await client.from("user_state").select("log_meta,plan_meta").maybeSingle();
    if (u.error) return classify(u.error, "Could not read the backup.");
    return { ok: true, rows: { sessions: s.rows, bodyweight: b.rows, plans: p.rows, user_state: u.data || null } };
  } catch (err) {
    return classify(err, "Could not read the backup.");
  } finally { st.busy = null; emit(); }
}

/* ------------------------------------------------------------ surface */

const api = Object.freeze({
  ready, subscribe, snapshot,
  signIn, signUp, signOut, changePassword,
  push, pull,
  user: () => st.user,
  lib: LIB_VERSION
});

window.PHAT_SYNC = api;
export default api;
export { ready, subscribe, snapshot, signIn, signUp, signOut, changePassword, push, pull };
