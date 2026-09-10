/* ============================================================================
   PHAT Gym Track — pure logic.

   CLASSIC SCRIPT, NOT AN ES MODULE. It has to run from file:// (opaque origin),
   where `import`/`fetch` fail, so tests.html can load it by double-click.

   Exposes exactly one global: window.PHAT.
   No DOM. No app state. No storage. Every function takes arguments and returns
   a value, so qa-engineer can test it in isolation (B-20, partial).

   Naming: everything below is local to this IIFE; the only top-level identifier
   is PHAT, checked against browser globals (CLAUDE.md §7 — the `top` incident).
   ========================================================================== */
(function () {
  "use strict";

  /* Stored shape version. History:
       1  the original store: no version key at all.
       2  WO-001 — dateBasis:"utc" markers on every pre-existing row, and one
          bodyweight row per date. No date value was rewritten, ever.
       3  WO-003 — four additive state keys on the LOG store, with defaults:
          reintro:{}, lastReintroDate:{}, calChangedAt:null, deload:null.
          Nothing existing is rewritten and nothing is removed. In particular
          `includeCut` STAYS ON DISK: a later item stops reading it, and
          deleting a key his data already contains is data loss with a tidy
          justification (WO-003 Decision 6).
     A store written by any earlier version must still load, forever. */
  var SCHEMA_VERSION = 3;
  /* The version that introduced the dateBasis marking pass. A store at or past
     this has already been marked; running the pass again would relabel rows
     written AFTER WO-001 (which are local-dated) as "utc". Gate on this, never
     on SCHEMA_VERSION. */
  var V_DATEBASIS = 2;
  /* The keys schema 3 adds to the log store, and their defaults. Built fresh
     on every call — a shared {} default would be handed to two stores. */
  var V3_KEYS = ["reintro", "lastReintroDate", "calChangedAt", "deload"];
  function v3Default(k) {
    if (k === "reintro" || k === "lastReintroDate") return {};
    return null;                                 // calChangedAt, deload
  }

  /* Limits. Weight in kg, reps whole. w === 0 is legal: bodyweight rack chins
     and unweighted dips are real sets (B-21). */
  var W_MIN = 0, W_MAX = 500;
  var R_MIN = 1, R_MAX = 100;

  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  /* Weight: digits with at most one dot, and at least one digit.
     "5" "5." ".5" "7.5" pass. "" "." ".." "-5" "1e3" "Infinity" "٥" fail.
     \d in JS is ASCII-only, so non-ASCII digits are rejected on purpose. */
  var NUM_W = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
  /* Reps: digits only. No dot at all, ever. */
  var NUM_R = /^\d+$/;

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function str(v) {
    return (v === undefined || v === null) ? "" : String(v);
  }

  function isObj(v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
  }

  /* --------------------------------------------------------------- dates */

  /* Local calendar date as YYYY-MM-DD, from local components (B-03).
     Never toISOString() — that is UTC and shifts the day.
     Invalid input falls back to now rather than returning null: a session
     stamped a few hours off is recoverable, a session stamped `null` is not. */
  function localDate(d) {
    var t = (d === undefined || d === null) ? new Date() : d;
    if (!(t instanceof Date)) t = new Date(t);
    if (isNaN(t.getTime())) t = new Date();
    return String(t.getFullYear()).padStart(4, "0") + "-" +
           pad2(t.getMonth() + 1) + "-" +
           pad2(t.getDate());
  }

  /* Age of a draft in whole calendar days. Anchored at local noon like fmt/ago,
     which makes it DST- and offset-safe. Accepts a draft object or a date
     string. Returns {ageDays:null, sameDay:false} when the date is unusable. */
  function draftAge(draft, nowLocalDate) {
    var out = { ageDays: null, sameDay: false };
    var d = isObj(draft) ? draft.date : draft;
    if (typeof d !== "string" || !DATE_RE.test(d)) return out;
    var now = (typeof nowLocalDate === "string" && DATE_RE.test(nowLocalDate))
      ? nowLocalDate : localDate();
    var a = Date.parse(d + "T12:00:00");
    var b = Date.parse(now + "T12:00:00");
    if (isNaN(a) || isNaN(b)) return out;
    out.ageDays = Math.round((b - a) / 86400000);
    out.sameDay = (d === now);
    return out;
  }

  /* -------------------------------------------------------------- parsing */

  /* {ok:true, value:Number} | {ok:false, reason:"empty"|"malformed"|"range"} */
  function parseWeight(v) {
    var s = str(v).trim();
    if (s === "") return { ok: false, reason: "empty" };
    if (!NUM_W.test(s)) return { ok: false, reason: "malformed" };
    var n = Number(s);
    if (!isFinite(n)) return { ok: false, reason: "malformed" };
    if (n < W_MIN || n > W_MAX) return { ok: false, reason: "range" };
    return { ok: true, value: n };
  }

  function parseReps(v) {
    var s = str(v).trim();
    if (s === "") return { ok: false, reason: "empty" };
    if (!NUM_R.test(s)) return { ok: false, reason: "malformed" };
    var n = Number(s);
    if (!isFinite(n) || !Number.isInteger(n)) return { ok: false, reason: "malformed" };
    if (n < R_MIN || n > R_MAX) return { ok: false, reason: "range" };
    return { ok: true, value: n };
  }

  /* ------------------------------------------------------- classification */

  /* "blank"      both fields empty            → skipped on save, silently
     "complete"   both parse and are in range  → saved
     "malformed"  a filled field fails to parse, or is out of range
                                                → blocks the save
     "incomplete" exactly one field filled, and what IS filled is fine
                                                → blocks the save
     A non-object set is "malformed", not "blank": it is not something the user
     typed, and it must never be skipped quietly.

     PRECEDENCE (Decision, 2026-09-09): malformed beats incomplete. Every
     non-empty field is parsed BEFORE completeness is considered, so
     {w:"7.5.0", r:""} is "malformed", not "incomplete". Telling someone to
     finish a row whose weight is garbage sends them to add reps to a broken
     number; naming the bad value is the useful answer.

     OUT OF RANGE (backend ruling, flagged for Chady): a value that parses but
     is outside the limits ("600" kg, "0" reps) classifies as "malformed" too —
     one blocking status, because the consequence is identical: it cannot be
     saved. The finer distinction survives one level down, as the per-field
     `reason`, which is "range" rather than "malformed" and lets W6 say "above
     500 kg" instead of "not a number". Note that "-5" and "1e3" never reach
     the range check at all: NUM_W rejects them as malformed BEFORE Number() is
     called, so "1e3" can never become 1000. A rejected value is never coerced. */
  function classifySet(s) {
    return describeSet(s).status;
  }

  /* describeSet(s)
       → { status, w:{ok, reason, value}, r:{ok, reason, value},
           problems:[{field, reason, value}] }
     The same classification as classifySet, but carrying WHICH field is bad,
     why, and the offending text verbatim so the caller can name it (W6 shows
     the `7.5.0` token). `value` is the trimmed raw string as typed — never a
     coerced number, so nothing here can leak a silently-fixed value.
     A row can be bad in the weight, in the reps, or in both; `problems` holds
     one item per bad field, in w-then-r order, INCLUDING the merely-empty one
     on a row that is also malformed. The status names the worst thing wrong
     with the row; `problems` names everything wrong with it, so the user is
     not sent back twice for the same row. */
  function describeSet(s) {
    var out = {
      status: "malformed",
      w: { ok: false, reason: "malformed", value: "" },
      r: { ok: false, reason: "malformed", value: "" },
      problems: []
    };
    if (!isObj(s)) {
      out.problems.push({ field: null, reason: "malformed", value: "" });
      return out;
    }
    var w = str(s.w).trim();
    var r = str(s.r).trim();
    var pw = parseWeight(w);
    var pr = parseReps(r);
    out.w = { ok: pw.ok, reason: pw.ok ? null : pw.reason, value: w };
    out.r = { ok: pr.ok, reason: pr.ok ? null : pr.reason, value: r };

    if (w === "" && r === "") { out.status = "blank"; return out; }

    if (!pw.ok) out.problems.push({ field: "w", reason: pw.reason, value: w });
    if (!pr.ok) out.problems.push({ field: "r", reason: pr.reason, value: r });

    /* Parseability first, completeness second. "empty" is not a parse failure —
       it is absence, and absence is what "incomplete" is for. */
    var bad = (!pw.ok && pw.reason !== "empty") || (!pr.ok && pr.reason !== "empty");
    if (bad) out.status = "malformed";
    else if (w === "" || r === "") out.status = "incomplete";
    else out.status = "complete";
    return out;
  }

  /* Keystroke filter for the numeric inputs.
     Returns the value the field should hold after this keystroke.

     Rule: a proposed value is either accepted whole or rejected whole. It is
     never "cleaned up" by removing an interior character, because removing a
     separator INFLATES the number — "7,5" would become "75" and "7.5.0" would
     become "750". W6 asserts that 750 can never appear from 7.5.0 by any route.
     Only surrounding whitespace is trimmed.

     kind "w": digits and at most one dot.  kind "r": digits only. */
  function sanitizeNumericInput(currentValue, proposedValue, kind) {
    var cur = str(currentValue);
    var next = str(proposedValue).trim();
    if (next === "") return "";                       // clearing is always allowed
    var allowed = (kind === "r") ? /^\d+$/ : /^[\d.]+$/;
    if (!allowed.test(next)) return cur;
    if (kind !== "r" && (next.split(".").length - 1) > 1) return cur;  // second dot
    return next;
  }

  /* --------------------------------------------------------- validation */

  /* validateEntry(sets)
       → { sets:[{w:Number, r:Number}], problems:[{i, field, reason, value, status}] }
     `sets` holds only complete sets, already coerced to numbers — never NaN,
     never a string. `problems` is non-empty when the caller must refuse to
     save. Nothing is ever dropped without appearing in one of the two.
     `value` (the offending text, verbatim) and `status` (the row's class, so
     the copy can differ between a malformed row and an unfinished one) are
     additive — the {i, field, reason} contract is unchanged. */
  function validateEntry(sets) {
    var out = { sets: [], problems: [] };
    if (!Array.isArray(sets)) {
      if (sets !== undefined && sets !== null) {
        out.problems.push({ i: -1, field: null, reason: "malformed", value: "", status: "malformed" });
      }
      return out;
    }
    for (var i = 0; i < sets.length; i++) {
      var d = describeSet(sets[i]);
      if (d.status === "blank") continue;
      if (d.status === "complete") {
        out.sets.push({ w: parseWeight(d.w.value).value, r: parseReps(d.r.value).value });
        continue;
      }
      /* Closure over i is safe: `var i` is function-scoped but the push happens
         synchronously in this iteration. */
      for (var j = 0; j < d.problems.length; j++) {
        var p = d.problems[j];
        out.problems.push({ i: i, field: p.field, reason: p.reason, value: p.value, status: d.status });
      }
    }
    return out;
  }

  /* validateDraft(draft)
       → { ok, entries, problems:[{exId, setIndex, field, reason}], setCount }
     `entries` is the object to persist: {exId:{sets:[{w,r}], note}}. An entry
     survives if it has at least one complete set OR a non-empty note — a typed
     note is data too and is not thrown away because the sets were left blank.
     `ok` false means: do not save, do not touch the draft. */
  function validateDraft(draft) {
    var res = { ok: false, entries: {}, problems: [], setCount: 0 };
    if (!isObj(draft) || !isObj(draft.entries)) {
      res.problems.push({ exId: null, setIndex: null, field: null, reason: "missing" });
      return res;
    }
    Object.keys(draft.entries).forEach(function (exId) {
      var e = draft.entries[exId];
      var v = validateEntry(isObj(e) ? e.sets : null);
      v.problems.forEach(function (p) {
        res.problems.push({
          exId: exId, setIndex: p.i, field: p.field, reason: p.reason,
          value: p.value, status: p.status
        });
      });
      var note = isObj(e) ? str(e.note) : "";
      if (v.sets.length || note.trim() !== "") {
        res.entries[exId] = { sets: v.sets, note: note };
      }
      res.setCount += v.sets.length;
    });
    res.ok = res.problems.length === 0;
    return res;
  }

  /* ------------------------------------------------ draft payload / session */

  /* classifyDraftPayload(raw)
       → { status:"none"|"ok"|"error", draft, reason }

     The pure half of loadDraft(): everything that can be decided from the
     stored TEXT alone. `raw` is the verbatim string read out of storage, or
     null/undefined when nothing is stored.

       none   nothing there            raw null/undefined/blank, or the literal
                                       JSON `null` (what del() writes through a
                                       bridge with no remove())
       error  something is there but   reason "parse"  — not JSON
              it is not a usable draft reason "shape"  — JSON, but not a draft
                                       object with an `entries` object
       ok     a draft-shaped object    draft is the parsed value, untouched

     "none" and "error" must never collapse into each other: an unreadable
     draft that looks absent is how a real session gets overwritten. The one
     status this function cannot produce is reason "read" (the storage call
     itself threw); that stays in the caller, which owns the storage bridge.

     A non-string, non-nullish `raw` is reason "parse". Payloads are text; if a
     bridge hands back something else we do not know what it is, and guessing
     is how data gets overwritten. */
  function classifyDraftPayload(raw) {
    if (raw === undefined || raw === null) return { status: "none", draft: null };
    if (typeof raw !== "string") return { status: "error", draft: null, reason: "parse" };
    if (raw.trim() === "") return { status: "none", draft: null };
    var v;
    try { v = JSON.parse(raw); }
    catch (e) { return { status: "error", draft: null, reason: "parse" }; }
    if (v === null) return { status: "none", draft: null };
    if (!isObj(v) || !isObj(v.entries)) return { status: "error", draft: null, reason: "shape" };
    return { status: "ok", draft: v };
  }

  /* buildSession(draft, dayId, dateStr, id)
       → { id, date, dayId, entries } | null

     The exact object finish() hands to save(), built with no DOM and no S, so
     the serialized JSON can be asserted directly (W2).

     Returns null — build nothing, save nothing — when:
       - the draft does not validate (any problem at all). Defence in depth: a
         caller that forgets to gate on validateDraft() still cannot write a
         session with a set missing from it (B-02).
       - dayId is not a non-empty string.
       - id is not a finite number or a non-empty string.
       - no usable date: `dateStr` is used when it is YYYY-MM-DD, else
         draft.date when that is, else null. It does NOT fall back to today —
         stamping a session with a date nobody chose is a silent wrong number,
         and the caller still holds the draft, so nothing is lost by refusing.

     A null return is a refusal, not a failure to log: the caller must show an
     error and leave the draft on disk.

     Zero complete sets is NOT a refusal — a notes-only entry is preserved and
     returned. Whether an empty session is worth saving is UI policy and stays
     in finish() ("Nothing logged yet."), so that this function is pure shape. */
  function buildSession(draft, dayId, dateStr, id) {
    var v = validateDraft(draft);
    if (!v.ok) return null;

    /* B-38: type-check before trimming. str() coerces, so `0` used to become
       the dayId "0" and `{}` the dayId "[object Object]" — a session built for
       a day that is not in PROGRAM, which is exactly what the doc comment
       above promises cannot happen. A dayId is a string or it is a refusal. */
    if (typeof dayId !== "string") return null;
    var day = dayId.trim();
    if (day === "") return null;

    var sid;
    if (typeof id === "number" && isFinite(id)) sid = id;
    else if (typeof id === "string" && id.trim() !== "") sid = id.trim();
    else return null;

    var date = null;
    if (typeof dateStr === "string" && DATE_RE.test(dateStr.trim())) date = dateStr.trim();
    else if (isObj(draft) && typeof draft.date === "string" && DATE_RE.test(draft.date.trim())) date = draft.date.trim();
    if (date === null) return null;

    /* Key order is the draft's insertion order, so JSON.stringify is stable
       and QA can assert on the string. */
    return { id: sid, date: date, dayId: day, entries: v.entries };
  }

  /* --------------------------------------------------- session history */

  /* A session's date, or "" when it has none this code can trust. "" is not a
     reason to drop the session anywhere below — it is a reason not to let it
     drive a date-gated rule. */
  function sessionDate(s) {
    if (!isObj(s) || typeof s.date !== "string") return "";
    var d = s.date.trim();
    return DATE_RE.test(d) ? d : "";
  }

  /* A logged set counts as COMPLETED when the reps parse to a whole number
     >= 1 and the weight parses to a number in range. Note what is NOT here:
     `w > 0`. A rack chin at 0 kg for 10 reps is a completed set, and every
     rule that reads history must see it (B-21, and B-32 one layer up).
     Numbers and numeric strings both pass — sets are strings while drafting
     and numbers once saved, and this has to read both. */
  function isDoneSet(x) {
    if (!isObj(x)) return false;
    return parseWeight(x.w).ok && parseReps(x.r).ok;
  }

  /* sortSessions(sessions) → a NEW array, ascending by local date.
     - Never mutates the input, and never copies the session objects: the
       elements are the same references, so nothing inside a session can be
       altered or dropped by sorting.
     - STABLE: two sessions on the same date keep the order they were logged
       in, which is the order they happened in. The index tiebreak is explicit
       rather than trusting the engine's sort stability.
     - Nothing is ever filtered. A session with no usable date sorts FIRST,
       keeping its relative order: it cannot be placed in time, and treating an
       undateable row as the most recent one would let it drive the verdict,
       the stall check and every week gate. It is still in the array.
     - A non-array in gives an empty array out, never a throw. */
  function sortSessions(sessions) {
    if (!Array.isArray(sessions)) return [];
    var wrapped = sessions.map(function (s, i) {
      return { s: s, i: i, d: sessionDate(s) };
    });
    wrapped.sort(function (a, b) {
      if (a.d !== b.d) return a.d < b.d ? -1 : 1;
      return a.i - b.i;
    });
    return wrapped.map(function (x) { return x.s; });
  }

  /* The local Monday that starts the week containing dateStr, as YYYY-MM-DD.
     Anchored at local noon so a DST shift moves the clock by an hour and never
     the calendar day. Returns null for an unusable date. */
  function weekStart(dateStr) {
    if (typeof dateStr !== "string" || !DATE_RE.test(dateStr.trim())) return null;
    var t = Date.parse(dateStr.trim() + "T12:00:00");
    if (isNaN(t)) return null;
    var back = (new Date(t).getDay() + 6) % 7;      // Mon 0 … Sun 6
    return localDate(new Date(t - back * 86400000));
  }

  /* trainingWeeks(sessions, todayStr) → integer.

     The number of local Monday-start weeks that hold at least
     TRAINING_WEEK_MIN (3) logged sessions, up to and including todayStr.

     This is deliberately NOT weeksIn(). weeksIn() measures elapsed time since
     the first session, so a fortnight off the gym still buys two weeks. Every
     rule in this batch that says "week 5" means five weeks of actual training,
     and unlocking accessories or a deload on the strength of a calendar is the
     failure this function exists to prevent. The two numbers are different on
     purpose and must be labelled differently wherever both are shown.

     Rules:
     - Weeks need not be consecutive; they are counted, not spanned.
     - Sessions dated after todayStr are not counted. A future-dated row cannot
       be evidence of training already done. It is not touched or removed.
     - Sessions with no usable date are not counted, for the same reason.
     - Two sessions on one date are two sessions. That is what was logged.
     - Empty log, or one session ever, → 0. One session is not a week. */
  var TRAINING_WEEK_MIN = 3;
  function trainingWeeks(sessions, todayStr) {
    if (!Array.isArray(sessions) || sessions.length === 0) return 0;
    var today = (typeof todayStr === "string" && DATE_RE.test(todayStr.trim()))
      ? todayStr.trim() : localDate();
    var byWeek = {}, n = 0;
    for (var i = 0; i < sessions.length; i++) {
      var d = sessionDate(sessions[i]);
      if (d === "" || d > today) continue;
      var wk = weekStart(d);
      if (wk === null) continue;
      byWeek[wk] = (byWeek[wk] || 0) + 1;
    }
    Object.keys(byWeek).forEach(function (k) {
      if (byWeek[k] >= TRAINING_WEEK_MIN) n++;
    });
    return n;
  }

  /* lastFor(sessions, exId) → the most recent entry for that exercise that has
     at least one COMPLETED set, or null.

     Scans backwards, so pass a sorted array — boot sorts once and every save
     keeps it sorted. It does not sort internally: that would hide an unsorted
     caller, and re-sorting on every card render is work the caller already did.

     The completeness test is isDoneSet: r >= 1 and w a number in range.
     index.html's old lastFor required `+x.w > 0`, so a 0 kg rack chin was
     never anybody's last session and the card read `First time logged` for as
     long as he trained it. That is B-21 surviving one layer up, and the
     backlog forbids reintroducing it.

     Returns the stored entry BY REFERENCE, for the same reason `sortSessions`
     does not copy: callers read it. Nothing in PHAT writes through it, and
     nothing else may either. */
  function lastFor(sessions, exId) {
    if (!Array.isArray(sessions)) return null;
    if (typeof exId !== "string" || exId.trim() === "") return null;
    var id = exId.trim();
    for (var i = sessions.length - 1; i >= 0; i--) {
      var s = sessions[i];
      if (!isObj(s) || !isObj(s.entries)) continue;
      if (!Object.prototype.hasOwnProperty.call(s.entries, id)) continue;
      var e = s.entries[id];
      if (!isObj(e) || !Array.isArray(e.sets)) continue;
      for (var j = 0; j < e.sets.length; j++) {
        if (isDoneSet(e.sets[j])) return e;
      }
    }
    return null;
  }

  /* --------------------------------------------------------- migration */

  /* migrateStore(log, bw)
       → { log, bw, changed, logChanged, bwChanged, notes }

     Non-destructive and idempotent. It NEVER rewrites a date string: a
     YYYY-MM-DD carries no offset, so the original local day of a UTC-stamped
     row is unrecoverable, and shifting every date would corrupt every row that
     was already correct (Decision 5). It marks them instead.

     - empty/absent stores  → schemaVersion on the returned object, nothing
                              else, changed:false (so boot writes nothing)
     - pre-existing rows    → schemaVersion 2, utcDatedBefore on the log,
                              dateBasis:"utc" on every existing row
     - two bodyweight rows on one date → keep the LAST in array order, and the
       dropped row is returned inside the note, not discarded quietly
     - already migrated     → no change, no notes
     - anything unparseable → inputs returned untouched with an error note.
       This function must never throw; boot proceeds with whatever loaded. */
  function migrateStore(log, bw) {
    var notes = [];
    var out = {
      log: log, bw: bw,
      changed: false, logChanged: false, bwChanged: false,
      notes: notes
    };
    try {
      var stamp = localDate();

      var logIsObj = isObj(log);
      var bwIsObj = isObj(bw);
      if (log !== undefined && log !== null && !logIsObj) {
        notes.push({ level: "error", key: "log", msg: "Log store is not an object. Left untouched." });
      }
      if (bw !== undefined && bw !== null && !bwIsObj) {
        notes.push({ level: "error", key: "bw", msg: "Bodyweight store is not an object. Left untouched." });
      }

      var logVer = (logIsObj && typeof log.schemaVersion === "number") ? log.schemaVersion : 1;
      var bwVer = (bwIsObj && typeof bw.schemaVersion === "number") ? bw.schemaVersion : 1;

      /* ---- sessions ---- */
      var nlog = null, markedSessions = 0;
      if (logIsObj && logVer < V_DATEBASIS) {
        nlog = {};
        Object.keys(log).forEach(function (k) { nlog[k] = log[k]; });
        nlog.schemaVersion = SCHEMA_VERSION;
        if (Array.isArray(log.sessions)) {
          nlog.sessions = log.sessions.map(function (s) {
            if (!isObj(s) || s.dateBasis !== undefined) return s;
            var c = {};
            Object.keys(s).forEach(function (k) { c[k] = s[k]; });
            c.dateBasis = "utc";
            markedSessions++;
            return c;
          });
        } else if (log.sessions !== undefined) {
          notes.push({ level: "error", key: "log", msg: "log.sessions is not an array. Left untouched." });
        }
      }

      /* ---- bodyweight ---- */
      var nbw = null, markedBw = 0, dropped = [];
      if (bwIsObj && bwVer < V_DATEBASIS) {
        nbw = {};
        Object.keys(bw).forEach(function (k) { nbw[k] = bw[k]; });
        nbw.schemaVersion = SCHEMA_VERSION;
        if (Array.isArray(bw.entries)) {
          var marked = bw.entries.map(function (e) {
            if (!isObj(e) || e.dateBasis !== undefined) return e;
            var c = {};
            Object.keys(e).forEach(function (k) { c[k] = e[k]; });
            c.dateBasis = "utc";
            markedBw++;
            return c;
          });
          /* Keep the last row for each date, in original order. Only exact
             same-date duplicates are touched. */
          var lastIdx = {};
          marked.forEach(function (e, i) {
            if (isObj(e) && typeof e.date === "string") lastIdx[e.date] = i;
          });
          var kept = marked.filter(function (e, i) {
            if (!isObj(e) || typeof e.date !== "string") return true;
            if (lastIdx[e.date] === i) return true;
            dropped.push(e);
            return false;
          });
          if (dropped.length) {
            notes.push({
              level: "warn", key: "bw",
              msg: "Dropped " + dropped.length + " duplicate bodyweight row" +
                   (dropped.length === 1 ? "" : "s") + " sharing a date; kept the last of each.",
              dropped: dropped
            });
          }
          nbw.entries = kept;
        } else if (bw.entries !== undefined) {
          notes.push({ level: "error", key: "bw", msg: "bw.entries is not an array. Left untouched." });
        }
      }

      var hadLegacy = markedSessions > 0 || markedBw > 0 || dropped.length > 0;
      if (hadLegacy) {
        if (!nlog) {
          /* bodyweight rows exist but there is no log object to stamp. Create
             the marker holder; it adds metadata, it removes nothing. */
          nlog = logIsObj ? log : { schemaVersion: SCHEMA_VERSION, sessions: [], includeCut: false };
          if (nlog === log) {
            var c2 = {};
            Object.keys(log).forEach(function (k) { c2[k] = log[k]; });
            nlog = c2;
          }
          nlog.schemaVersion = SCHEMA_VERSION;
        }
        if (nlog.utcDatedBefore === undefined) nlog.utcDatedBefore = stamp;
        notes.push({
          level: "info", key: "log",
          msg: "Marked " + markedSessions + " session(s) and " + markedBw +
               " bodyweight row(s) as UTC-dated. No date value was changed."
        });
      }

      /* ---- schema 3: additive state keys on the log store (WO-003 D6) ----
         Adds only what is missing, rewrites nothing, removes nothing. Gated on
         the ORIGINAL version, not on nlog's — the v1 pass above has already
         stamped nlog to 3, and reading the version back off it would skip the
         keys for exactly the oldest stores that need them.
         `includeCut` is deliberately untouched: it stops being READ later in
         this batch and stays on disk forever (Decision 6).
         Nothing is invented from nothing: an absent log store stays absent, so
         an empty install still boots with zero writes. */
      var v3Added = [], v3Bumped = false;
      if (logVer < SCHEMA_VERSION && (nlog || logIsObj)) {
        if (!nlog) {
          nlog = {};
          Object.keys(log).forEach(function (k) { nlog[k] = log[k]; });
        }
        V3_KEYS.forEach(function (k) {
          if (!Object.prototype.hasOwnProperty.call(nlog, k)) {
            nlog[k] = v3Default(k);
            v3Added.push(k);
          }
        });
        v3Bumped = nlog.schemaVersion !== SCHEMA_VERSION;
        nlog.schemaVersion = SCHEMA_VERSION;
        if (v3Added.length || v3Bumped) {
          notes.push({
            level: "info", key: "log",
            msg: "Schema " + SCHEMA_VERSION + ": added " +
                 (v3Added.length ? v3Added.join(", ") : "no new key") +
                 ". No existing value was changed."
          });
        }
      }

      if (nlog) out.log = nlog;
      if (nbw) out.bw = nbw;
      /* changed drives the boot write. An empty store must not trigger one.
         The bodyweight store carries no schema-3 key, so a v2 bw store is not
         rewritten just to restamp its version — bwPayload() stamps it on the
         next real bodyweight entry. One less boot write, no content at stake. */
      out.logChanged = hadLegacy || v3Added.length > 0 || v3Bumped;
      out.bwChanged = markedBw > 0 || dropped.length > 0;
      out.changed = out.logChanged || out.bwChanged;
      return out;
    } catch (err) {
      return {
        log: log, bw: bw,
        changed: false, logChanged: false, bwChanged: false,
        notes: [{ level: "error", key: null, msg: "Migration failed, data left untouched: " + (err && err.message) }]
      };
    }
  }

  /* ------------------------------------------------------------- exports */

  window.PHAT = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    LIMITS: { wMin: W_MIN, wMax: W_MAX, rMin: R_MIN, rMax: R_MAX },
    localDate: localDate,
    draftAge: draftAge,
    parseWeight: parseWeight,
    parseReps: parseReps,
    classifySet: classifySet,
    describeSet: describeSet,
    sanitizeNumericInput: sanitizeNumericInput,
    validateEntry: validateEntry,
    validateDraft: validateDraft,
    classifyDraftPayload: classifyDraftPayload,
    buildSession: buildSession,
    isDoneSet: isDoneSet,
    sortSessions: sortSessions,
    weekStart: weekStart,
    TRAINING_WEEK_MIN: TRAINING_WEEK_MIN,
    trainingWeeks: trainingWeeks,
    lastFor: lastFor,
    migrateStore: migrateStore
  };
})();
