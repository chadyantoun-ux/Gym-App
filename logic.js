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
       4  WO-004 — the plan document. Sessions written from here on may carry
          `planId`. NOTHING existing is stamped: an absent planId MEANS the
          shipped PHAT plan, resolved at read time by planIdOf, so the v4 pass
          touches not one stored session and adds not one key to the log store.
          The only thing it writes is the version itself, so the store stops
          understating its own shape to WO-002's importer and to sync.
          Plans live in their own store (`phat:v1:plans`), not in the log.
     A store written by any earlier version must still load, forever.
     WO-002's importer therefore owes schema 2, 3 AND 4. */
  var SCHEMA_VERSION = 4;
  /* EVERY migration pass gates on its OWN constant, never on SCHEMA_VERSION.
     The near-miss on record (decisions.md, "Schema 3, and what it obliges"):
     the dateBasis pass was gated on `logVer < SCHEMA_VERSION`, so bumping the
     constant would have re-run it over a v2 store and relabelled correctly
     local-dated, post-WO-001 sessions as "utc" — silently corrupting the
     provenance flag every date window depends on. Bumping to 4 is the same
     trap one version later, which is why V_STATEKEYS exists below. */
  var V_DATEBASIS = 2;
  var V_STATEKEYS = 3;   /* the four V1/D1/W1 keys — was `logVer < SCHEMA_VERSION` */
  var V_PLAN = 4;        /* the plan document */
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

  /* dateAdd(dateStr, n) -> the local calendar date n days from dateStr, as
     YYYY-MM-DD, or null when either input is unusable.

     Anchored at local noon like draftAge and index.html's fmt/ago, which makes
     it DST- and offset-safe: a clock shift moves the hour and never the day,
     so [today-6 .. today] is seven dates in March as well as in June.

     null rather than a fallback to today, unlike localDate(): every window in
     Rule W1 and Rule ST1 is built from this, and a window that is silently the
     wrong seven days is a confidently wrong number about his food or his
     training. A window that cannot be built produces no advice at all. */
  function dateAdd(dateStr, n) {
    if (typeof dateStr !== "string" || !DATE_RE.test(dateStr.trim())) return null;
    if (typeof n !== "number" || !isFinite(n)) return null;
    var t = Date.parse(dateStr.trim() + "T12:00:00");
    if (isNaN(t)) return null;
    return localDate(new Date(t + Math.round(n) * 86400000));
  }

  /* dayGap(fromStr, toStr) -> whole calendar days from -> to, positive when
     `to` is the later date, negative when it is earlier, or null. Same noon
     anchoring, same reason. */
  function dayGap(fromStr, toStr) {
    if (typeof fromStr !== "string" || !DATE_RE.test(fromStr.trim())) return null;
    if (typeof toStr !== "string" || !DATE_RE.test(toStr.trim())) return null;
    var a = Date.parse(fromStr.trim() + "T12:00:00");
    var b = Date.parse(toStr.trim() + "T12:00:00");
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  /* The caller's "today", or the real local date when it is unusable. Every
     rule takes todayStr so a test can pin the day without touching the clock. */
  function safeToday(todayStr) {
    return (typeof todayStr === "string" && DATE_RE.test(todayStr.trim()))
      ? todayStr.trim() : localDate();
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* "2026-09-16" -> "16 Sep". Built from a fixed table and NOT from Intl.
     en-GB short month is "Sept" on current ICU (Node 24, recent Chrome), and
     the copy strength-coach signed off is `Hold until 16 Sep`. A string a test
     pins and a coach approved may not change when a browser updates its
     locale data. NOTE for W8/W10: index.html's fmt() still goes through Intl,
     so it prints "Sept" where this prints "Sep" - a real inconsistency, but
     one that lives in index.html and is not this rule's to fix silently. */
  function dayMon(dateStr) {
    if (typeof dateStr !== "string" || !DATE_RE.test(dateStr.trim())) return "";
    var p = dateStr.trim().split("-");
    var m = Number(p[1]);
    if (!(m >= 1 && m <= 12)) return "";
    return String(Number(p[2])) + " " + MONTHS[m - 1];
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

  /* buildSession(draft, dayId, dateStr, id, planId)
       → { id, date, dayId, planId?, entries } | null

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
     in finish() ("Nothing logged yet."), so that this function is pure shape.

     `planId` (schema 4) is OPTIONAL and is omitted from the object entirely
     when it is not a non-empty string — the four-argument call is byte-for-byte
     the session it always built. Absence is not a hole: planIdOf() reads an
     absent planId as the shipped PHAT plan, which is what every session logged
     before schema 4 was. It is NOT a refusal like a missing date, because a
     missing date is unrecoverable and a missing planId is not. */
  function buildSession(draft, dayId, dateStr, id, planId) {
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
    var out = { id: sid, date: date, dayId: day };
    if (typeof planId === "string" && planId.trim() !== "") out.planId = planId.trim();
    out.entries = v.entries;
    return out;
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

  /* Did this session contain any training at all? True when at least one set
     anywhere in it passes isDoneSet.

     A save carrying only a note is not a training day (strength-coach ruling,
     WO-003 W1, [Certain]). The note is kept, stored and shown — it is simply
     not evidence that he trained. The interaction runs the other way too: a
     session of nothing but 0 kg rack chins DOES qualify, because isDoneSet
     tests r > 0 and not w > 0. */
  function sessionHasCompletedSet(s) {
    if (!isObj(s) || !isObj(s.entries)) return false;
    var ids = Object.keys(s.entries);
    for (var i = 0; i < ids.length; i++) {
      var e = s.entries[ids[i]];
      if (!isObj(e) || !Array.isArray(e.sets)) continue;
      for (var j = 0; j < e.sets.length; j++) {
        if (isDoneSet(e.sets[j])) return true;
      }
    }
    return false;
  }

  /* trainingDays(sessions, todayStr) → a NEW array of DISTINCT local dates,
     ascending, on which at least one set was completed, up to and including
     todayStr.

     DAYS, not sessions. Three saves on one date are one day of training: a
     re-save after a mistake and a genuine two-a-day both count once, because
     everything built on this counts weeks of EXPOSURE, not work done in a day
     (strength-coach ruling, WO-003 W1, [Certain] — a counting error, not a
     coaching judgement). Counting saves would tell the app it has evidence it
     does not have, at every gate that reads it.

     Nothing is dropped from storage here; this returns a view. */
  function trainingDays(sessions, todayStr) {
    if (!Array.isArray(sessions)) return [];
    var today = (typeof todayStr === "string" && DATE_RE.test(todayStr.trim()))
      ? todayStr.trim() : localDate();
    var seen = {}, out = [];
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      var d = sessionDate(s);
      if (d === "" || d > today) continue;
      if (!sessionHasCompletedSet(s)) continue;
      if (Object.prototype.hasOwnProperty.call(seen, d)) continue;
      seen[d] = true;
      out.push(d);
    }
    out.sort();
    return out;
  }

  /* trainingWeeks(sessions, todayStr) → integer.

     The number of local Monday-start weeks holding at least
     TRAINING_WEEK_MIN (3) distinct TRAINING DAYS, up to and including
     todayStr.

     This is deliberately NOT weeksIn(). weeksIn() measures elapsed time since
     the first session, so a fortnight off the gym still buys two weeks. Every
     rule in this batch that says "week 5" means five weeks of actual training,
     and unlocking accessories or a deload on the strength of a calendar is the
     failure this function exists to prevent. The two numbers are different on
     purpose and must be labelled differently wherever both are shown.

     Rules:
     - Distinct dates, not sessions, and only dates carrying a completed set.
       See trainingDays.
     - Weeks need not be consecutive; they are counted, not spanned.
     - Dates after todayStr are not counted. A future-dated row cannot be
       evidence of training already done. It is not touched or removed.
     - Dates this code cannot read are not counted, for the same reason.
     - Empty log, or one training day ever, → 0. One day is not a week.

     WHY A FIXED MONDAY GRID AND NOT A ROLLING WINDOW — ruled, do not re-open
     (strength-coach, WO-003 W1). Sunday belongs to the week before it, so
     Sun + Mon + Tue is two weeks of one and two days, not one week of three.
     That straddle is only reachable by training off-programme on a Sunday: the
     programme is Mon/Tue/Thu/Fri/Sat with Sunday rest. A fixed grid can only
     ever UNDERCOUNT against a rolling one, so the error runs in the safe
     direction at all three gates this feeds — it delays a reintroduction, a
     stall test and a deload rather than bringing one forward. And a rolling
     count means greedily packed disjoint blocks anchored on the first session:
     a number he cannot reproduce from a calendar, and one that shifts whenever
     history is edited. A gate he cannot audit is a gate he will not trust. */
  var TRAINING_WEEK_MIN = 3;
  function trainingWeeks(sessions, todayStr) {
    var days = trainingDays(sessions, todayStr);
    var byWeek = {}, n = 0;
    for (var i = 0; i < days.length; i++) {
      var wk = weekStart(days[i]);
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

  /* ====================================================== the plan document

     WO-004 W2. The structure a plan lives in, and the identity rules that make
     a logged set findable forever.

     IDENTITY, and why it is opaque
     ------------------------------
     An exercise is identified by `id`. The id is generated once, is never
     derived from a name, and is NEVER rewritten - not by a rename, not by a
     reorder, not by copying the plan. `n` is a display field and nothing else.

     The design prototype keyed exercises `slug(name) + ":" + kind`. Combined
     with a plan editor that can rename, that makes a typo a data-loss event:
     every engine in this file reads history by exercise id (`lastFor`,
     `e1rmByDate`, `liftDays`, `speedLoad`, `d1Rows`, `painWindow`, and the
     `entries` object of every stored session is keyed by it), so a renamed
     exercise would orphan its entire history in silence. It also collapsed the
     two "Skull crusher" slots - d1h is 3x6-10 on a power day, d5i is 3x12-15
     on a hypertrophy day - into one history, which is a second bug wearing the
     same coat. Rejected outright (WO-004 C-6, CLAUDE.md 3.3).

     `lift` - two ids, one lift
     --------------------------
     The design's trend requirement is real and is kept by a SEPARATE field.
     `lift` is an explicit "this is the same movement as" grouping. d1h and d5i
     share `lift`, so the Trend tab can chart one Skull crusher line, while
     `lastFor("d1h")` and `lastFor("d5i")` stay two different histories.

     Nothing that reads stored sets may group by `lift`. `lift` is plan data:
     it is read live off the plan document, it is never written into a session,
     and it can therefore be re-grouped later without touching a logged number.
     `lift` is also an opaque id and is NOT rewritten by a rename, or the
     grouping would break on the same rename this whole section exists to
     survive. The lift's DISPLAY name is resolved at read time from the plan
     (`liftName`), so renaming an exercise renames its trend line, correctly.

     The id space
     ------------
     Day ids, exercise ids and lift ids share ONE namespace per plan, so a
     minted id cannot collide across kinds either. Minted ids look like
     `x_3f9dz01`. The shipped plan's ids (`d1`..`d5`, `d1a`..`d5j`, `l_row`...)
     are hand-authored FROZEN TOKENS in that same space: they read like words,
     they were never derived from a name, and no code may ever recompute them
     from `n`. `d1..d5` and `d1a..d5j` do not move, ever - `REINTRO_ORDER`,
     `SPEED_SRC` and the caller's `KEY_LIFTS` are all keyed by them, and the
     stored `reintro` counter is keyed by dayId (WO-004 C-5).

     Purity. Nothing in this section reads the clock, the DOM or storage, and
     no function here mutates its argument: every editor returns a NEW plan. */

  var PHAT_PLAN_ID = "phat";
  var PLAN_KINDS = ["power", "hyp", "speed"];
  /* Rule I1's implement tags. Exported so an add-exercise form cannot drift
     from the validator, for the same reason LIMITS is exported. */
  var PLAN_IMPLEMENTS = ["bb", "db", "machine", "cable", "bodyweight"];

  var ID_KIND = { ex: "x", day: "y", lift: "l", plan: "p" };
  var idSeq = 0;

  function tok36() {
    return Math.floor(Math.random() * 1679616).toString(36);
  }

  /* mintId(taken, kind) -> a fresh opaque id.

     `taken` is an object used as a set (see takenIds) or an array of ids.
     Math.random rather than crypto.randomUUID: this has to run from file://
     on any browser, and the value is probed against `taken` regardless - the
     guarantee is the probe, not the entropy. The function CANNOT return an id
     that is already taken: if 64 random draws all collide it falls through to
     a deterministic walk that terminates on the first free id. */
  function mintId(taken, kind) {
    var k = own(ID_KIND, str(kind)) ? ID_KIND[str(kind)] : "x";
    var used = {}, i, id;
    if (Array.isArray(taken)) {
      for (i = 0; i < taken.length; i++) if (typeof taken[i] === "string") used[taken[i]] = true;
    } else if (isObj(taken)) {
      used = taken;
    }
    for (i = 0; i < 64; i++) {
      idSeq = (idSeq + 1) % 1679616;
      id = k + "_" + tok36() + tok36() + idSeq.toString(36);
      if (!own(used, id)) return id;
    }
    i = 0;
    do { id = k + "_z" + (i++).toString(36); } while (own(used, id));
    return id;
  }

  /* Every id in use anywhere in a plan, as a set. Plan id, day ids, exercise
     ids and lift ids together - one namespace (see above). */
  function takenIds(plan) {
    var t = {};
    if (!isObj(plan)) return t;
    if (typeof plan.planId === "string" && plan.planId !== "") t[plan.planId] = true;
    var days = Array.isArray(plan.days) ? plan.days : [];
    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      if (!isObj(d)) continue;
      if (typeof d.id === "string" && d.id !== "") t[d.id] = true;
      var ex = Array.isArray(d.ex) ? d.ex : [];
      for (var j = 0; j < ex.length; j++) {
        var e = ex[j];
        if (!isObj(e)) continue;
        if (typeof e.id === "string" && e.id !== "") t[e.id] = true;
        if (typeof e.lift === "string" && e.lift !== "") t[e.lift] = true;
      }
    }
    return t;
  }

  function newExId(plan) { return mintId(takenIds(plan), "ex"); }
  function newDayId(plan) { return mintId(takenIds(plan), "day"); }
  function newLiftId(plan) { return mintId(takenIds(plan), "lift"); }

  /* A structural clone. JSON, deliberately: it drops functions, prototypes and
     cycles, which is exactly what a plan document is not allowed to contain.
     Returns null rather than throwing on anything unclonable. */
  function clonePlan(plan) {
    try { return JSON.parse(JSON.stringify(plan)); }
    catch (e) { return null; }
  }

  function deepFreeze(o) {
    if (o === null || typeof o !== "object" || Object.isFrozen(o)) return o;
    Object.freeze(o);
    Object.keys(o).forEach(function (k) { deepFreeze(o[k]); });
    return o;
  }

  /* ----------------------------------------------------------- reading */

  /* planIdOf(session) -> the plan a session belongs to.

     A session written before schema 4 carries no planId. Its absence MEANS the
     shipped PHAT plan: there was only ever one plan, and its ids are d1..d5 /
     d1a..d5j. Resolving that at READ time is why the v4 migration does not
     have to touch a single stored session (see migrateStore). */
  function planIdOf(session) {
    if (isObj(session) && typeof session.planId === "string" && session.planId.trim() !== "") {
      return session.planId.trim();
    }
    return PHAT_PLAN_ID;
  }

  function planDays(plan) {
    if (Array.isArray(plan)) return plan;              /* a bare days array */
    return (isObj(plan) && Array.isArray(plan.days)) ? plan.days : [];
  }

  function exById(plan, exId) {
    var id = str(exId).trim();
    if (id === "") return null;
    var days = planDays(plan);
    for (var i = 0; i < days.length; i++) {
      var ex = isObj(days[i]) && Array.isArray(days[i].ex) ? days[i].ex : [];
      for (var j = 0; j < ex.length; j++) {
        if (isObj(ex[j]) && str(ex[j].id).trim() === id) return ex[j];
      }
    }
    return null;
  }

  /* The id of the day an exercise sits on, or null. */
  function dayIdOfEx(plan, exId) {
    var id = str(exId).trim();
    if (id === "") return null;
    var days = planDays(plan);
    for (var i = 0; i < days.length; i++) {
      var ex = isObj(days[i]) && Array.isArray(days[i].ex) ? days[i].ex : [];
      for (var j = 0; j < ex.length; j++) {
        if (isObj(ex[j]) && str(ex[j].id).trim() === id) return str(days[i].id).trim() || null;
      }
    }
    return null;
  }

  function liftOf(plan, exId) {
    var e = exById(plan, exId);
    if (!e) return null;
    var l = str(e.lift).trim();
    return l === "" ? null : l;
  }

  /* Every exercise id in a lift group, in plan order. This is the ONLY sanctioned
     way to widen a per-exercise read into a per-lift one: the Trend tab calls the
     existing id-keyed engines once per id and merges. No engine takes a liftId. */
  function exIdsForLift(plan, liftId) {
    var want = str(liftId).trim(), out = [];
    if (want === "") return out;
    var days = planDays(plan);
    for (var i = 0; i < days.length; i++) {
      var ex = isObj(days[i]) && Array.isArray(days[i].ex) ? days[i].ex : [];
      for (var j = 0; j < ex.length; j++) {
        if (isObj(ex[j]) && str(ex[j].lift).trim() === want) {
          var id = str(ex[j].id).trim();
          if (id !== "" && out.indexOf(id) < 0) out.push(id);
        }
      }
    }
    return out;
  }

  /* The display name of a lift group: the name of the FIRST exercise in plan
     order carrying it. Resolved at read time on purpose - rename the exercise
     and its trend line is renamed with it, which is the whole point of keeping
     the name out of the identity. */
  function liftName(plan, liftId) {
    var want = str(liftId).trim();
    if (want === "") return "";
    var days = planDays(plan);
    for (var i = 0; i < days.length; i++) {
      var ex = isObj(days[i]) && Array.isArray(days[i].ex) ? days[i].ex : [];
      for (var j = 0; j < ex.length; j++) {
        if (isObj(ex[j]) && str(ex[j].lift).trim() === want) {
          var n = str(ex[j].n).trim();
          return n !== "" ? n : want;
        }
      }
    }
    return want;
  }

  /* Every lift group in a plan: [{lift, name, exIds}] in plan order. The Trend
     tab's index. */
  function planLifts(plan) {
    var seen = {}, out = [];
    var days = planDays(plan);
    for (var i = 0; i < days.length; i++) {
      var ex = isObj(days[i]) && Array.isArray(days[i].ex) ? days[i].ex : [];
      for (var j = 0; j < ex.length; j++) {
        if (!isObj(ex[j])) continue;
        var l = str(ex[j].lift).trim();
        if (l === "" || own(seen, l)) continue;
        seen[l] = true;
        out.push({ lift: l, name: liftName(plan, l), exIds: exIdsForLift(plan, l) });
      }
    }
    return out;
  }

  /* ------------------------------------------- the plan-scoped rule tables

     WO-004 W3. Four readers, one writer-side scrubber, and one provenance
     test. Every reader RECONCILES: an id a table names that the plan no longer
     contains is dropped on the way out, so no engine can be handed a dangling
     id and no screen can render one. The scrub at edit time (scrubPlanRefs,
     called by removeExercise) removes it from the document as well; the
     readers still filter, because a plan can also arrive from storage, from an
     import, or from an editor build that predates the scrub.

     "Drop the reference, keep the rest" is the whole rule: deleting the row
     that d3a's speed load was computed from costs d3a its number and costs
     nothing else - not the other two speed slots, not the reintroduction
     order, not the key lifts. Failure is per-reference, never per-table.

     None of these reads the clock, storage or history. */

  /* Is this actually a plan document? Every engine that takes an optional
     `plan` defaults to the shipped PHAT plan when the answer is no, and NEVER
     treats a non-plan as "a plan that declares nothing" - that would turn a
     caller's mistake into a confident ABSENT sentence about a plan that does
     not exist. A plan built from empty still has `days: []`, so a zero-day plan
     passes and a `{deload:…}` object does not. */
  function isPlanDoc(p) { return isObj(p) && Array.isArray(p.days); }

  var PLAN_KEYLIFT_MAX = 4;   /* audit 12: four lifts, and that is settled   */
  var PLAN_REDUCED_DEFAULT = 4;  /* the weeks-1-4 block, when a plan that HAS
                                    a cut tier declares no number of its own */

  /* planSpeedSource(plan) -> { speedExId: sourceExId }.
     Both ends must still exist in the plan or the pair is dropped. */
  function planSpeedSource(plan) {
    var out = {};
    if (!isObj(plan) || !isObj(plan.speedSource)) return out;
    var keys = Object.keys(plan.speedSource);
    for (var i = 0; i < keys.length; i++) {
      var k = str(keys[i]).trim();
      var v = str(plan.speedSource[keys[i]]).trim();
      if (k === "" || v === "") continue;
      if (!exById(plan, k) || !exById(plan, v)) continue;
      out[k] = v;
    }
    return out;
  }

  /* planReintroOrder(plan) -> { dayId: [exId, ...] }, or one day's list when
     `dayId` is given. Reconciled against the day it is applied to: ids the
     plan lists that this day does not mark `cut` are dropped, and `cut` ids
     the plan did not list are APPENDED in plan order. A cut accessory that no
     order names must still be reachable, or it can never come back. */
  function planReintroOrder(plan, dayId) {
    var want = (dayId !== undefined && dayId !== null) ? str(dayId).trim() : null;
    var decl = (isObj(plan) && isObj(plan.reintroOrder)) ? plan.reintroOrder : {};
    var days = planDays(plan), out = {}, i, j;
    for (i = 0; i < days.length; i++) {
      var d = days[i];
      if (!isObj(d)) continue;
      var did = str(d.id).trim();
      if (did === "" || (want !== null && did !== want)) continue;
      var cuts = cutIdsOf(d.ex);
      var listed = own(decl, did) && Array.isArray(decl[did]) ? decl[did] : [];
      var list = [];
      for (j = 0; j < listed.length; j++) {
        var id = str(listed[j]).trim();
        if (cuts.indexOf(id) >= 0 && list.indexOf(id) < 0) list.push(id);
      }
      for (j = 0; j < cuts.length; j++) if (list.indexOf(cuts[j]) < 0) list.push(cuts[j]);
      if (list.length) out[did] = list;
    }
    return want !== null ? (own(out, want) ? out[want] : []) : out;
  }

  /* planKeyLiftIds(plan) -> [exId], in declared order, existing slots only,
     capped at four. planKeyLifts joins them to the slot, so the NAME ST1 says
     is the name on the card. */
  function planKeyLiftIds(plan) {
    var out = [];
    if (!isObj(plan) || !Array.isArray(plan.keyLifts)) return out;
    for (var i = 0; i < plan.keyLifts.length && out.length < PLAN_KEYLIFT_MAX; i++) {
      var id = str(plan.keyLifts[i]).trim();
      if (id === "" || out.indexOf(id) >= 0) continue;
      if (!exById(plan, id)) continue;
      out.push(id);
    }
    return out;
  }

  function planKeyLifts(plan) {
    var ids = planKeyLiftIds(plan), out = [];
    for (var i = 0; i < ids.length; i++) {
      var e = exById(plan, ids[i]);
      if (!isObj(e)) continue;
      out.push({ id: ids[i], n: (typeof e.n === "string" && e.n.trim() !== "") ? e.n : ids[i],
                 s: e.s, lo: e.lo, hi: e.hi, k: e.k, lift: e.lift });
    }
    return out;
  }

  /* Does this plan HAVE a reduced-volume tier at all? V1's ABSENT test, and it
     is a property of the plan, answerable on day zero with an empty log. */
  function planHasCutTier(plan) {
    var days = planDays(plan);
    for (var i = 0; i < days.length; i++) {
      if (isObj(days[i]) && cutIdsOf(days[i].ex).length) return true;
    }
    return false;
  }

  /* planReducedWeeks(plan) -> integer. A declared value wins. A plan that
     marks accessories `cut` but declares no number gets the shipped 4: the
     tier exists, so the coach's rule for it applies, and the alternative is an
     accessory tier with no end date. Zero is legal and means "no block". */
  function planReducedWeeks(plan) {
    if (isObj(plan) && isInt(plan.reducedWeeks, 0, 52)) return plan.reducedWeeks;
    return PLAN_REDUCED_DEFAULT;
  }

  /* phatProvenance(plan) -> Boolean. Rule C7b, addendum 8.4.

     TRUE means: this is the programme a coach assessed, so the brief's
     DIAGNOSIS may be spoken. It is not "this looks like PHAT" - it is
     `planId === "phat"`, or a copy that still carries `derivedFrom:"phat"`
     AND still declares the same four key lifts AND has not changed one of
     their s / lo / hi. Renaming a slot or editing a cue keeps provenance;
     turning squat from 3x3-5 into 5x5 loses it, because a 5x5 squat is not
     the programme the brief was certain about.

     It FAILS CLOSED. Every uncertain path returns false, and false costs one
     sentence of specificity - never a wrong claim. */
  function phatProvenance(plan) {
    if (!isObj(plan)) return false;
    if (str(plan.planId).trim() === PHAT_PLAN_ID) return true;
    if (str(plan.derivedFrom).trim() !== PHAT_PLAN_ID) return false;
    var want = planKeyLiftIds(PHAT_PLAN), got = planKeyLiftIds(plan), i;
    if (got.length !== want.length) return false;
    for (i = 0; i < want.length; i++) if (got[i] !== want[i]) return false;
    for (i = 0; i < want.length; i++) {
      var a = exById(PHAT_PLAN, want[i]), b = exById(plan, want[i]);
      if (!isObj(a) || !isObj(b)) return false;
      if (b.s !== a.s || b.lo !== a.lo || b.hi !== a.hi) return false;
    }
    return true;
  }

  /* scrubPlanRefs(plan, exId) -> the same plan object, mutated.
     PRIVATE, and it only ever runs on a fresh clone inside an editor - never
     on a caller's plan. Deleting an exercise drops every plan-scoped reference
     to it and leaves every other reference standing. */
  function scrubPlanRefs(plan, exId) {
    var id = str(exId).trim();
    if (!isObj(plan) || id === "") return plan;
    if (isObj(plan.speedSource)) {
      Object.keys(plan.speedSource).forEach(function (k) {
        if (str(k).trim() === id || str(plan.speedSource[k]).trim() === id) {
          delete plan.speedSource[k];
        }
      });
    }
    if (isObj(plan.reintroOrder)) {
      Object.keys(plan.reintroOrder).forEach(function (k) {
        if (!Array.isArray(plan.reintroOrder[k])) return;
        plan.reintroOrder[k] = plan.reintroOrder[k].filter(function (v) {
          return str(v).trim() !== id;
        });
      });
    }
    if (Array.isArray(plan.keyLifts)) {
      plan.keyLifts = plan.keyLifts.filter(function (v) { return str(v).trim() !== id; });
    }
    return plan;
  }

  /* ---------------------------------------------------------- validation */

  function isInt(v, lo, hi) {
    return typeof v === "number" && isFinite(v) && Math.floor(v) === v && v >= lo && v <= hi;
  }

  /* validatePlan(plan) -> {ok, problems:[{scope, id, field, reason}]}

     Rejects loudly; it never repairs and never drops. Reasons are developer
     signals, never copy (decisions.md, 2026-09-10: "A reason is a developer
     signal, never copy").

     The load-bearing rule: NO exercise may exist without `k` and `implement`
     (WO-004 C-7). `k` selects P1 vs H1 vs the speed branch and R1's rest row;
     `implement` drives Z2's load word and I2's increment line. An untyped
     exercise is an exercise the app would guess about, out loud, in kilograms. */
  function validatePlan(plan) {
    var problems = [];
    function bad(scope, id, field, reason) {
      problems.push({ scope: scope, id: id, field: field, reason: reason });
    }
    if (!isObj(plan)) {
      bad("plan", null, null, "missing");
      return { ok: false, problems: problems };
    }
    if (typeof plan.planId !== "string" || plan.planId.trim() === "") bad("plan", null, "planId", "missing");
    if (typeof plan.name !== "string" || plan.name.trim() === "") bad("plan", str(plan.planId), "name", "missing");
    if (!Array.isArray(plan.days)) {
      bad("plan", str(plan.planId), "days", "type");
      return { ok: false, problems: problems };
    }
    var seen = {};
    if (typeof plan.planId === "string" && plan.planId.trim() !== "") seen[plan.planId.trim()] = true;
    plan.days.forEach(function (d, di) {
      if (!isObj(d)) { bad("day", String(di), null, "type"); return; }
      var did = str(d.id).trim();
      if (did === "") bad("day", String(di), "id", "missing");
      else if (own(seen, did)) bad("day", did, "id", "duplicate");
      else seen[did] = true;
      if (typeof d.name !== "string" || d.name.trim() === "") bad("day", did || String(di), "name", "missing");
      if (!Array.isArray(d.ex)) { bad("day", did || String(di), "ex", "type"); return; }
      d.ex.forEach(function (e, ei) {
        var where = did + "[" + ei + "]";
        if (!isObj(e)) { bad("ex", where, null, "type"); return; }
        var id = str(e.id).trim();
        if (id === "") bad("ex", where, "id", "missing");
        else if (own(seen, id)) bad("ex", id, "id", "duplicate");
        else seen[id] = true;
        if (typeof e.n !== "string" || e.n.trim() === "") bad("ex", id || where, "n", "missing");
        if (!isInt(e.s, 1, 20)) bad("ex", id || where, "s", "range");
        if (!isInt(e.lo, R_MIN, R_MAX)) bad("ex", id || where, "lo", "range");
        if (!isInt(e.hi, R_MIN, R_MAX)) bad("ex", id || where, "hi", "range");
        if (isInt(e.lo, R_MIN, R_MAX) && isInt(e.hi, R_MIN, R_MAX) && e.lo > e.hi) {
          bad("ex", id || where, "hi", "range");
        }
        if (PLAN_KINDS.indexOf(e.k) < 0) bad("ex", id || where, "k", "enum");
        if (PLAN_IMPLEMENTS.indexOf(e.implement) < 0) bad("ex", id || where, "implement", "enum");
        if (str(e.lift).trim() === "") bad("ex", id || where, "lift", "missing");
        if (e.cut !== undefined && e.cut !== 1) bad("ex", id || where, "cut", "type");
        if (e.cue !== undefined && typeof e.cue !== "string") bad("ex", id || where, "cue", "type");
      });
    });
    /* The plan-scoped rule tables (W3). TYPES ONLY. A reference to an id the
       plan does not contain is NOT a validation failure: it is what a
       half-finished edit looks like, the readers reconcile it away, and
       refusing to save a plan over a stale entry in a lookup table would cost
       him the edit. Only a table of the wrong SHAPE is rejected, because that
       is the one a reader cannot interpret. */
    if (plan.keyLifts !== undefined) {
      if (!Array.isArray(plan.keyLifts)) bad("plan", str(plan.planId), "keyLifts", "type");
      else if (plan.keyLifts.length > PLAN_KEYLIFT_MAX) bad("plan", str(plan.planId), "keyLifts", "range");
      else plan.keyLifts.forEach(function (v) {
        if (typeof v !== "string" || v.trim() === "") bad("plan", str(plan.planId), "keyLifts", "type");
      });
    }
    if (plan.speedSource !== undefined) {
      if (!isObj(plan.speedSource)) bad("plan", str(plan.planId), "speedSource", "type");
      else Object.keys(plan.speedSource).forEach(function (k) {
        if (typeof plan.speedSource[k] !== "string" || plan.speedSource[k].trim() === "") {
          bad("plan", str(plan.planId), "speedSource", "type");
        }
      });
    }
    if (plan.reintroOrder !== undefined) {
      if (!isObj(plan.reintroOrder)) bad("plan", str(plan.planId), "reintroOrder", "type");
      else Object.keys(plan.reintroOrder).forEach(function (k) {
        if (!Array.isArray(plan.reintroOrder[k])) bad("plan", str(plan.planId), "reintroOrder", "type");
      });
    }
    if (plan.reducedWeeks !== undefined && !isInt(plan.reducedWeeks, 0, 52)) {
      bad("plan", str(plan.planId), "reducedWeeks", "range");
    }

    /* Second pass, after every day and exercise id is known. A lift token is
       SHARED on purpose (d1h and d5i are both l_skull), so it is not checked
       for duplication against itself - only against the id namespace, where a
       collision would make one token mean two things. */
    plan.days.forEach(function (d) {
      if (!isObj(d) || !Array.isArray(d.ex)) return;
      d.ex.forEach(function (e) {
        if (!isObj(e)) return;
        var lift = str(e.lift).trim();
        if (lift !== "" && own(seen, lift)) bad("ex", str(e.id).trim(), "lift", "duplicate");
      });
    });
    return { ok: problems.length === 0, problems: problems };
  }

  /* ------------------------------------------------------------- editing

     Every function below returns {ok, plan, ...}. On ok:false the ORIGINAL
     plan comes back untouched and `problems` says why - a rejected edit must
     never half-apply. */

  function editFail(plan, problems) {
    return { ok: false, plan: plan, problems: problems };
  }

  /* renameExercise(plan, exId, name) -> {ok, plan, problems}

     The proof that a rename is cosmetic. It writes `n`. It does not touch
     `id`, it does not touch `lift`, it does not touch a stored session, and
     the history keyed by `id` is exactly as reachable afterwards. */
  function renameExercise(plan, exId, name) {
    var id = str(exId).trim();
    var nm = (typeof name === "string") ? name.trim() : "";
    if (!isObj(plan)) return editFail(plan, [{ scope: "plan", id: null, field: null, reason: "missing" }]);
    if (id === "") return editFail(plan, [{ scope: "ex", id: null, field: "id", reason: "missing" }]);
    if (nm === "") return editFail(plan, [{ scope: "ex", id: id, field: "n", reason: "empty" }]);
    if (plan.readOnly === true) return editFail(plan, [{ scope: "plan", id: str(plan.planId), field: "readOnly", reason: "locked" }]);
    if (!exById(plan, id)) return editFail(plan, [{ scope: "ex", id: id, field: "id", reason: "unknown" }]);
    var next = clonePlan(plan);
    if (!next) return editFail(plan, [{ scope: "plan", id: str(plan.planId), field: null, reason: "unclonable" }]);
    var target = exById(next, id);
    target.n = nm;
    return { ok: true, plan: next, problems: [] };
  }

  function renameDay(plan, dayId, name) {
    var id = str(dayId).trim();
    var nm = (typeof name === "string") ? name.trim() : "";
    if (!isObj(plan)) return editFail(plan, [{ scope: "plan", id: null, field: null, reason: "missing" }]);
    if (nm === "") return editFail(plan, [{ scope: "day", id: id, field: "name", reason: "empty" }]);
    if (plan.readOnly === true) return editFail(plan, [{ scope: "plan", id: str(plan.planId), field: "readOnly", reason: "locked" }]);
    var next = clonePlan(plan);
    if (!next) return editFail(plan, [{ scope: "plan", id: str(plan.planId), field: null, reason: "unclonable" }]);
    var days = planDays(next), hit = null;
    for (var i = 0; i < days.length; i++) if (isObj(days[i]) && str(days[i].id).trim() === id) hit = days[i];
    if (!hit) return editFail(plan, [{ scope: "day", id: id, field: "id", reason: "unknown" }]);
    hit.name = nm;
    return { ok: true, plan: next, problems: [] };
  }

  /* addExercise(plan, dayId, spec) -> {ok, plan, exId, lift, problems}

     `k` and `implement` are REQUIRED. There is no path to an untyped exercise
     and no default is guessed here (WO-004 C-7): the add flow asks, or the add
     is refused. `lift` is optional - supply one to say "this is the same
     movement as that other slot", omit it and a fresh lift group is minted. */
  function addExercise(plan, dayId, spec) {
    var did = str(dayId).trim();
    if (!isObj(plan)) return editFail(plan, [{ scope: "plan", id: null, field: null, reason: "missing" }]);
    if (plan.readOnly === true) return editFail(plan, [{ scope: "plan", id: str(plan.planId), field: "readOnly", reason: "locked" }]);
    if (!isObj(spec)) return editFail(plan, [{ scope: "ex", id: null, field: null, reason: "missing" }]);

    var problems = [];
    var nm = (typeof spec.n === "string") ? spec.n.trim() : "";
    if (nm === "") problems.push({ scope: "ex", id: null, field: "n", reason: "missing" });
    if (!isInt(spec.s, 1, 20)) problems.push({ scope: "ex", id: null, field: "s", reason: "range" });
    if (!isInt(spec.lo, R_MIN, R_MAX)) problems.push({ scope: "ex", id: null, field: "lo", reason: "range" });
    if (!isInt(spec.hi, R_MIN, R_MAX)) problems.push({ scope: "ex", id: null, field: "hi", reason: "range" });
    if (isInt(spec.lo, R_MIN, R_MAX) && isInt(spec.hi, R_MIN, R_MAX) && spec.lo > spec.hi) {
      problems.push({ scope: "ex", id: null, field: "hi", reason: "range" });
    }
    if (PLAN_KINDS.indexOf(spec.k) < 0) problems.push({ scope: "ex", id: null, field: "k", reason: "enum" });
    if (PLAN_IMPLEMENTS.indexOf(spec.implement) < 0) problems.push({ scope: "ex", id: null, field: "implement", reason: "enum" });
    if (spec.cut !== undefined && spec.cut !== 1) problems.push({ scope: "ex", id: null, field: "cut", reason: "type" });
    if (spec.cue !== undefined && typeof spec.cue !== "string") problems.push({ scope: "ex", id: null, field: "cue", reason: "type" });
    if (problems.length) return { ok: false, plan: plan, exId: null, lift: null, problems: problems };

    var next = clonePlan(plan);
    if (!next) return { ok: false, plan: plan, exId: null, lift: null,
                        problems: [{ scope: "plan", id: str(plan.planId), field: null, reason: "unclonable" }] };
    var days = planDays(next), day = null, i;
    for (i = 0; i < days.length; i++) if (isObj(days[i]) && str(days[i].id).trim() === did) day = days[i];
    if (!day) return { ok: false, plan: plan, exId: null, lift: null,
                       problems: [{ scope: "day", id: did, field: "id", reason: "unknown" }] };
    if (!Array.isArray(day.ex)) day.ex = [];

    var taken = takenIds(next);
    var exId = mintId(taken, "ex");
    taken[exId] = true;                                  /* before the lift mint */
    var lift = (typeof spec.lift === "string" && spec.lift.trim() !== "")
      ? spec.lift.trim()
      : mintId(taken, "lift");

    var e = { id: exId, n: nm, s: spec.s, lo: spec.lo, hi: spec.hi,
              k: spec.k, implement: spec.implement, lift: lift };
    if (spec.cut === 1) e.cut = 1;
    if (typeof spec.cue === "string" && spec.cue.trim() !== "") e.cue = spec.cue.trim();
    day.ex.push(e);
    return { ok: true, plan: next, exId: exId, lift: lift, problems: [] };
  }

  function addDay(plan, name) {
    var nm = (typeof name === "string") ? name.trim() : "";
    if (!isObj(plan)) return editFail(plan, [{ scope: "plan", id: null, field: null, reason: "missing" }]);
    if (plan.readOnly === true) return editFail(plan, [{ scope: "plan", id: str(plan.planId), field: "readOnly", reason: "locked" }]);
    if (nm === "") return editFail(plan, [{ scope: "day", id: null, field: "name", reason: "missing" }]);
    var next = clonePlan(plan);
    if (!next) return editFail(plan, [{ scope: "plan", id: str(plan.planId), field: null, reason: "unclonable" }]);
    if (!Array.isArray(next.days)) next.days = [];
    var id = mintId(takenIds(next), "day");
    next.days.push({ id: id, name: nm, ex: [] });
    return { ok: true, plan: next, dayId: id, problems: [] };
  }

  /* moveExercise(plan, dayId, from, to) -> {ok, plan, problems}
     Reorder within a day. Order is presentation; no id moves. */
  function moveExercise(plan, dayId, from, to) {
    var did = str(dayId).trim();
    if (!isObj(plan)) return editFail(plan, [{ scope: "plan", id: null, field: null, reason: "missing" }]);
    if (plan.readOnly === true) return editFail(plan, [{ scope: "plan", id: str(plan.planId), field: "readOnly", reason: "locked" }]);
    var next = clonePlan(plan);
    if (!next) return editFail(plan, [{ scope: "plan", id: str(plan.planId), field: null, reason: "unclonable" }]);
    var days = planDays(next), day = null, i;
    for (i = 0; i < days.length; i++) if (isObj(days[i]) && str(days[i].id).trim() === did) day = days[i];
    if (!day || !Array.isArray(day.ex)) return editFail(plan, [{ scope: "day", id: did, field: "id", reason: "unknown" }]);
    var n = day.ex.length;
    if (!isInt(from, 0, n - 1) || !isInt(to, 0, n - 1)) {
      return editFail(plan, [{ scope: "day", id: did, field: "index", reason: "range" }]);
    }
    day.ex.splice(to, 0, day.ex.splice(from, 1)[0]);
    return { ok: true, plan: next, problems: [] };
  }

  /* removeExercise(plan, exId) -> {ok, plan, removed, problems}

     Removes the slot from the PLAN. It does not and cannot delete a logged
     set: history lives in `session.entries[exId]` and is untouched, so putting
     the exercise back with the same id restores the whole trend. The removed
     object is RETURNED so an undo can put it back byte-for-byte. */
  function removeExercise(plan, exId) {
    var id = str(exId).trim();
    if (!isObj(plan)) return { ok: false, plan: plan, removed: null, problems: [{ scope: "plan", id: null, field: null, reason: "missing" }] };
    if (plan.readOnly === true) return { ok: false, plan: plan, removed: null, problems: [{ scope: "plan", id: str(plan.planId), field: "readOnly", reason: "locked" }] };
    if (!exById(plan, id)) return { ok: false, plan: plan, removed: null, problems: [{ scope: "ex", id: id, field: "id", reason: "unknown" }] };
    var removed = clonePlan(exById(plan, id));
    var next = clonePlan(plan);
    if (!next) return { ok: false, plan: plan, removed: null, problems: [{ scope: "plan", id: str(plan.planId), field: null, reason: "unclonable" }] };
    var days = planDays(next);
    for (var i = 0; i < days.length; i++) {
      var ex = (isObj(days[i]) && Array.isArray(days[i].ex)) ? days[i].ex : [];
      for (var j = 0; j < ex.length; j++) {
        if (isObj(ex[j]) && str(ex[j].id).trim() === id) { ex.splice(j, 1); j--; }
      }
    }
    /* W3 edit-time reconciliation. Drop every plan-scoped reference to the id
       and keep the rest: deleting the row costs d3a its computed speed load
       and costs no other slot, no other table and no logged set. `next` is a
       fresh clone, so the caller's plan is not touched. */
    scrubPlanRefs(next, id);
    return { ok: true, plan: next, removed: removed, problems: [] };
  }

  /* copyPlan(plan, name, todayStr) -> {ok, plan, problems}

     IDS ARE PRESERVED. A copy is "my version of PHAT", not a new programme:
     re-minting the ids would orphan every logged set in exactly the way this
     whole section exists to prevent. Only `planId`, `name`, `from`, `readOnly`
     and `createdAt` change.

     `todayStr` is passed in, never read from a clock - and if it is not a
     usable local date, `createdAt` is null. A date nobody chose is a silent
     wrong number (decisions.md, buildSession refuses rather than guessing).

     `derivedFrom` is CARRIED, not rewritten: a copy of PHAT is still derived
     from PHAT, which is the gate the coach's ST1 ruling needs (decisions.md,
     "ST1: the measurement travels, the diagnosis does not"). A plan built from
     empty has no `derivedFrom` and never acquires one. `from` is the human
     provenance line; `derivedFrom` is the machine one, and they are separate
     so that renaming a plan can never change which rules it may run. */
  function copyPlan(plan, name, todayStr) {
    if (!isObj(plan)) return editFail(plan, [{ scope: "plan", id: null, field: null, reason: "missing" }]);
    var next = clonePlan(plan);
    if (!next) return editFail(plan, [{ scope: "plan", id: str(plan.planId), field: null, reason: "unclonable" }]);
    var srcName = (typeof plan.name === "string" && plan.name.trim() !== "") ? plan.name.trim() : str(plan.planId);
    next.planId = mintId(takenIds(next), "plan");
    next.name = (typeof name === "string" && name.trim() !== "") ? name.trim() : srcName + " — my version";
    next.from = "Copied from " + srcName;
    next.readOnly = false;
    next.createdAt = dateOrNull(todayStr);
    if (typeof next.derivedFrom !== "string" || next.derivedFrom.trim() === "") {
      delete next.derivedFrom;
    }
    return { ok: true, plan: next, problems: [] };
  }

  /* ------------------------------------------------- the shipped PHAT plan

     The 42 coach-verified slots, byte-for-byte the ids, names, s/lo/hi/k/cut
     and implement tags that shipped in index.html's PROGRAM, plus `lift` and
     `cue`.

     `days` is the same shape index.html calls PROGRAM, so PHAT.PHAT_PLAN.days
     is a drop-in for it and findDay/exName keep working unchanged.

     `wd` is the weekday label (B-31). It is display data and the correct
     expression of the rest day the design tried to encode by renumbering the
     days; nothing renders it yet.

     CUES ARE TRANSCRIBED FROM THE DESIGN PROTOTYPE AND ARE NOT YET SIGNED OFF
     (WO-004 C-8 is escalated to Chady). Nothing renders `cue` today. Two slots
     deliberately carry NO cue - d2e "Glute-ham raise or lying leg curl" and
     d3d "DB row or shrug" - because the design dropped the alternate and its
     cue is wrong for the other half of the pair (B-28 / WO-004 W1).

     LIFT GROUPS. Two slots share a lift if and only if they name the same
     movement, plus each speed slot sharing its source lift's group (which is
     what SPEED_SRC already asserts). Where the naming is ambiguous the slots
     get SEPARATE lifts: a wrong grouping merges two lifts into one wrong
     trend line, a missing grouping only costs a second line.

     THE FOUR PLAN-SCOPED RULE TABLES (WO-004 W3)
     --------------------------------------------
     `keyLifts`, `speedSource`, `reintroOrder` and `reducedWeeks` used to be
     hard-coded constants in this file, which asserted that every plan is PHAT.
     They are programme data, so they live on the programme. The shipped plan
     declares exactly the values that shipped as constants; PHAT.SPEED_SRC,
     PHAT.REINTRO_ORDER and PHAT.KEY_LIFTS are now COMPILED FROM HERE and are
     still exported, so nothing that read them breaks.

     A copy inherits all four (copyPlan clones the document). An edited copy
     keeps whichever survive its edits - removeExercise scrubs the reference
     rather than leaving a dangling id (scrubPlanRefs). A plan built from empty
     declares none, and every rule keyed to one then returns its named ABSENT
     state (Rules C7a/C7b, addendum 8.4) instead of guessing.

     `keyLifts` is ids only, never names. The name is resolved from the slot at
     read time (planKeyLifts), so a rename reaches ST1's copy with no second
     place to update - the same reason `lift` carries no name. */
  var PHAT_PLAN = deepFreeze({
    planId: PHAT_PLAN_ID,
    name: "PHAT",
    from: "Layne Norton, Power Hypertrophy Adaptive Training",
    derivedFrom: PHAT_PLAN_ID,
    readOnly: true,
    createdAt: null,
    /* ST1's four lifts (audit 4/12) - row, bench, squat, deadlift. Max 4. */
    keyLifts: ["d1a", "d1d", "d2a", "d2d"],
    /* SP1: speed slot -> the power lift its 65-70% is computed from (audit 7). */
    speedSource: { d3a: "d1a", d4a: "d2a", d5a: "d1d" },
    /* V1: per-day reintroduction order (audit 5). The coach's ordering, not
       programme order - d4 and d5 are deliberately out of slot order. */
    reintroOrder: {
      d1: ["d1c"], d2: ["d2c"], d3: ["d3d", "d3g"],
      d4: ["d4g", "d4c"], d5: ["d5d", "d5j", "d5g"]
    },
    /* V1: the weeks-1-4 block. Reduced volume holds for training weeks
       1..reducedWeeks; the first accessory can come back in the week after. */
    reducedWeeks: 4,
    days: [
      { id: "d1", name: "Upper power", wd: "Mon", ex: [
        { id: "d1a", n: "Bent-over row", s: 3, lo: 3, hi: 5, k: "power", implement: "bb", lift: "l_row",
          cue: "Torso near-parallel, pull to the navel, no hitching." },
        { id: "d1b", n: "Weighted pull-up", s: 2, lo: 6, hi: 10, k: "power", implement: "bodyweight", lift: "l_pullup",
          cue: "Chest to the bar, control the descent." },
        { id: "d1c", n: "Rack chin", s: 2, lo: 6, hi: 10, k: "power", implement: "bodyweight", lift: "l_rackchin", cut: 1,
          cue: "Feet on the rack, squeeze at the top." },
        { id: "d1d", n: "Flat DB press", s: 3, lo: 3, hi: 5, k: "power", implement: "db", lift: "l_dbbench",
          cue: "Elbows at 45°, dumbbells stacked over the wrists." },
        { id: "d1e", n: "Weighted dip", s: 2, lo: 6, hi: 10, k: "power", implement: "bodyweight", lift: "l_dip",
          cue: "Slight forward lean for chest, upright for triceps." },
        { id: "d1f", n: "Seated DB shoulder press", s: 3, lo: 6, hi: 10, k: "power", implement: "db", lift: "l_dbshoulder",
          cue: "Ribs down, don't arch the lower back." },
        { id: "d1g", n: "Cambered bar curl", s: 3, lo: 6, hi: 10, k: "power", implement: "bb", lift: "l_barcurl",
          cue: "Elbows pinned at the sides." },
        { id: "d1h", n: "Skull crusher", s: 3, lo: 6, hi: 10, k: "power", implement: "bb", lift: "l_skull",
          cue: "Elbows still, lower to the forehead." }
      ] },
      { id: "d2", name: "Lower power", wd: "Tue", ex: [
        { id: "d2a", n: "Squat", s: 3, lo: 3, hi: 5, k: "power", implement: "bb", lift: "l_squat",
          cue: "Brace hard, knees track over the toes, break at the hip and knee together." },
        { id: "d2b", n: "Hack squat", s: 2, lo: 6, hi: 10, k: "power", implement: "machine", lift: "l_hack",
          cue: "Full depth before the knees drift forward." },
        { id: "d2c", n: "Leg extension", s: 2, lo: 6, hi: 10, k: "power", implement: "machine", lift: "l_legext", cut: 1,
          cue: "Pause a beat at lockout." },
        { id: "d2d", n: "Stiff-leg deadlift", s: 3, lo: 5, hi: 8, k: "power", implement: "bb", lift: "l_sldl",
          cue: "Push the hips back, bar close, neutral spine." },
        { id: "d2e", n: "Glute-ham raise or lying leg curl", s: 2, lo: 6, hi: 10, k: "power", implement: "bodyweight", lift: "l_ghr" },
        { id: "d2f", n: "Standing calf raise", s: 3, lo: 6, hi: 10, k: "power", implement: "machine", lift: "l_calfstand",
          cue: "Full stretch at the bottom, pause at the top." },
        { id: "d2g", n: "Seated calf raise", s: 2, lo: 6, hi: 10, k: "power", implement: "machine", lift: "l_calfseat",
          cue: "Slow, no bouncing off the stretch." }
      ] },
      { id: "d3", name: "Back & shoulders", wd: "Thu", ex: [
        { id: "d3a", n: "Row — speed work", s: 6, lo: 3, hi: 3, k: "speed", implement: "bb", lift: "l_row",
          cue: "65–70% of your power-day top set. Moved fast, never ground." },
        { id: "d3b", n: "Rack chin", s: 3, lo: 8, hi: 12, k: "hyp", implement: "bodyweight", lift: "l_rackchin",
          cue: "Feet on the rack, squeeze at the top." },
        { id: "d3c", n: "Seated cable row", s: 3, lo: 8, hi: 12, k: "hyp", implement: "cable", lift: "l_cablerow",
          cue: "Chest up, drive the elbows back." },
        { id: "d3d", n: "DB row or shrug", s: 2, lo: 12, hi: 15, k: "hyp", implement: "db", lift: "l_dbrow", cut: 1 },
        { id: "d3e", n: "Close-grip pulldown", s: 2, lo: 15, hi: 20, k: "hyp", implement: "cable", lift: "l_pulldown",
          cue: "Lean back slightly, pull to the collarbone." },
        { id: "d3f", n: "Seated DB press", s: 3, lo: 8, hi: 12, k: "hyp", implement: "db", lift: "l_dbpress",
          cue: "Ribs down, press in a shallow arc." },
        { id: "d3g", n: "Upright row", s: 2, lo: 12, hi: 15, k: "hyp", implement: "bb", lift: "l_uprightrow", cut: 1,
          cue: "Lead with the elbows, stop at chest height." },
        { id: "d3h", n: "Lateral raise", s: 3, lo: 12, hi: 20, k: "hyp", implement: "db", lift: "l_lateral",
          cue: "Little fingers high, no swinging." }
      ] },
      { id: "d4", name: "Lower hypertrophy", wd: "Fri", ex: [
        { id: "d4a", n: "Squat — speed work", s: 6, lo: 3, hi: 3, k: "speed", implement: "bb", lift: "l_squat",
          cue: "65–70%. Explosive out of the hole, short rest." },
        { id: "d4b", n: "Hack squat", s: 3, lo: 8, hi: 12, k: "hyp", implement: "machine", lift: "l_hack",
          cue: "Depth before load." },
        { id: "d4c", n: "Leg press", s: 2, lo: 12, hi: 15, k: "hyp", implement: "machine", lift: "l_legpress", cut: 1,
          cue: "Don't let the lower back round off the pad." },
        { id: "d4d", n: "Leg extension", s: 3, lo: 15, hi: 20, k: "hyp", implement: "machine", lift: "l_legext",
          cue: "These should burn." },
        { id: "d4e", n: "Romanian deadlift", s: 3, lo: 8, hi: 12, k: "hyp", implement: "bb", lift: "l_rdl",
          cue: "Hips back, hamstrings loaded, spine neutral." },
        { id: "d4f", n: "Lying leg curl", s: 2, lo: 12, hi: 15, k: "hyp", implement: "machine", lift: "l_legcurl",
          cue: "Hips down, curl to the glutes." },
        { id: "d4g", n: "Seated leg curl", s: 2, lo: 15, hi: 20, k: "hyp", implement: "machine", lift: "l_legcurlseat", cut: 1,
          cue: "Full range, slow return." },
        { id: "d4h", n: "Donkey calf raise", s: 4, lo: 10, hi: 15, k: "hyp", implement: "machine", lift: "l_calfdonkey",
          cue: "Deep stretch each rep." },
        { id: "d4i", n: "Seated calf raise", s: 3, lo: 15, hi: 20, k: "hyp", implement: "machine", lift: "l_calfseat",
          cue: "No bouncing." }
      ] },
      { id: "d5", name: "Chest & arms", wd: "Sat", ex: [
        { id: "d5a", n: "Flat DB press — speed work", s: 6, lo: 3, hi: 3, k: "speed", implement: "db", lift: "l_dbbench",
          cue: "65–70%. Fast off the chest, short rest." },
        { id: "d5b", n: "Incline DB press", s: 3, lo: 8, hi: 12, k: "hyp", implement: "db", lift: "l_inclinedb",
          cue: "30–35° bench, elbows tucked." },
        { id: "d5c", n: "Machine chest press", s: 3, lo: 12, hi: 15, k: "hyp", implement: "machine", lift: "l_machinepress",
          cue: "Squeeze at the end of the press." },
        { id: "d5d", n: "Incline cable fly", s: 2, lo: 15, hi: 20, k: "hyp", implement: "cable", lift: "l_fly", cut: 1,
          cue: "Slight elbow bend held throughout." },
        { id: "d5e", n: "Cambered bar preacher curl", s: 3, lo: 8, hi: 12, k: "hyp", implement: "bb", lift: "l_preacher",
          cue: "No swinging off the pad." },
        { id: "d5f", n: "DB concentration curl", s: 2, lo: 12, hi: 15, k: "hyp", implement: "db", lift: "l_concurl",
          cue: "Elbow into the thigh, supinate hard." },
        { id: "d5g", n: "Spider curl", s: 2, lo: 15, hi: 20, k: "hyp", implement: "bb", lift: "l_spider", cut: 1,
          cue: "Arms hanging vertical." },
        { id: "d5h", n: "Close-grip bench", s: 3, lo: 8, hi: 12, k: "hyp", implement: "bb", lift: "l_cgbench",
          cue: "Shoulder-width grip, elbows in." },
        { id: "d5i", n: "Skull crusher", s: 3, lo: 12, hi: 15, k: "hyp", implement: "bb", lift: "l_skull",
          cue: "Elbows still." },
        { id: "d5j", n: "Rope pressdown", s: 2, lo: 15, hi: 20, k: "hyp", implement: "cable", lift: "l_pressdown", cut: 1,
          cue: "Spread the rope at the bottom." }
      ] }
    ]
  });

  /* ------------------------------------------------------ the plan store

     Stored separately from the log (`phat:v1:plans`), on purpose: the log
     store's shape is frozen by this change, so schema 4 adds not one key to
     it and a v3 log store migrates by having its version stamped and nothing
     else. The shipped PHAT plan is CODE, not data - it is never written to
     storage, so it cannot go stale against logic.js.

       { schemaVersion, plans:[<plan document>], activePlanId }

     normalisePlanStore repairs additively and never drops: it stamps the
     version, mints a `lift` for any exercise missing one, and mints an `id`
     for any exercise or day missing one (an exercise with no id has no history
     to lose, so minting is the only way it can ever have any). It rewrites no
     existing value. */
  function normalisePlanStore(store) {
    var out = { store: store, changed: false, added: [] };
    if (!isObj(store)) return out;
    var next = copyObj(store), changed = false, added = [];

    if (!Array.isArray(next.plans)) {
      if (next.plans === undefined) { next.plans = []; changed = true; added.push("plans"); }
      else return out;                       /* present but wrong type: refuse */
    } else {
      next.plans = next.plans.map(function (p) {
        if (!isObj(p)) return p;
        var np = clonePlan(p);
        if (!np) return p;
        var taken = takenIds(np), touched = false;
        if (typeof np.planId !== "string" || np.planId.trim() === "") {
          np.planId = mintId(taken, "plan"); taken[np.planId] = true; touched = true;
        }
        var days = Array.isArray(np.days) ? np.days : [];
        days.forEach(function (d) {
          if (!isObj(d)) return;
          if (typeof d.id !== "string" || d.id.trim() === "") {
            d.id = mintId(taken, "day"); taken[d.id] = true; touched = true;
          }
          (Array.isArray(d.ex) ? d.ex : []).forEach(function (e) {
            if (!isObj(e)) return;
            if (typeof e.id !== "string" || e.id.trim() === "") {
              e.id = mintId(taken, "ex"); taken[e.id] = true; touched = true;
            }
            if (typeof e.lift !== "string" || e.lift.trim() === "") {
              e.lift = mintId(taken, "lift"); taken[e.lift] = true; touched = true;
            }
          });
        });
        if (touched) { changed = true; added.push(str(np.planId)); }
        return touched ? np : p;
      });
    }
    if (next.activePlanId === undefined) { next.activePlanId = PHAT_PLAN_ID; changed = true; added.push("activePlanId"); }
    if (next.schemaVersion !== SCHEMA_VERSION) { next.schemaVersion = SCHEMA_VERSION; changed = true; }
    if (!changed) return out;
    out.store = next; out.changed = true; out.added = added;
    return out;
  }

  /* --------------------------------------------------------- migration */

  /* migrateStore(log, bw, plans)
       → { log, bw, plans, changed, logChanged, bwChanged, plansChanged, notes }

     `plans` is optional and is the phat:v1:plans store. Omit it and `plans`
     comes back undefined and `plansChanged` false — which is every caller
     today, and every existing test.

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
  function migrateStore(log, bw, plans) {
    var notes = [];
    var out = {
      log: log, bw: bw, plans: plans,
      changed: false, logChanged: false, bwChanged: false, plansChanged: false,
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
      if (logVer < V_STATEKEYS && (nlog || logIsObj)) {
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

      /* ---- schema 4: the plan document (WO-004 W2) ----
         The whole pass, and it is deliberately this small.

         A session gains an OPTIONAL `planId`. Existing sessions are NOT
         stamped with one: absence means the shipped PHAT plan, resolved at
         read time by planIdOf. So every stored session, every entry key, every
         date and every {w, r} comes out of this migration byte-identical, and
         the rename that motivated the whole work order cannot reach a stored
         value because a stored value never carried a name.

         Not one key is added to the log store either — plans live in their own
         store. All this pass writes is the version, so the store stops
         understating its own shape to WO-002's importer and to any sync layer
         (the same trade QA accepted for v2 -> v3: one idempotent boot write
         beats a store that misreports itself for the rest of its life).

         Gated on V_PLAN, never on SCHEMA_VERSION. */
      var v4Bumped = false;
      if (logVer < V_PLAN && (nlog || logIsObj)) {
        if (!nlog) {
          nlog = {};
          Object.keys(log).forEach(function (k) { nlog[k] = log[k]; });
        }
        v4Bumped = nlog.schemaVersion !== SCHEMA_VERSION;
        nlog.schemaVersion = SCHEMA_VERSION;
        if (v4Bumped) {
          notes.push({
            level: "info", key: "log",
            msg: "Schema " + V_PLAN + ": sessions may now carry planId. " +
                 "No session was touched and no key was added."
          });
        }
      }

      /* ---- the plan store, if the caller has one ----
         Absent (undefined) is the normal case today and does nothing: an empty
         install still boots with zero writes. Repairs are additive only. */
      var pres = { store: plans, changed: false, added: [] };
      if (plans !== undefined && plans !== null) {
        if (!isObj(plans)) {
          notes.push({ level: "error", key: "plans", msg: "Plan store is not an object. Left untouched." });
        } else {
          pres = normalisePlanStore(plans);
          if (pres.changed) {
            notes.push({
              level: "info", key: "plans",
              msg: "Schema " + SCHEMA_VERSION + ": plan store normalised" +
                   (pres.added.length ? " (" + pres.added.join(", ") + ")" : "") +
                   ". No existing value was changed."
            });
          }
        }
      }

      if (nlog) out.log = nlog;
      if (nbw) out.bw = nbw;
      out.plans = pres.store;
      /* changed drives the boot write. An empty store must not trigger one.
         The bodyweight store carries no schema-3 key, so a v2 bw store is not
         rewritten just to restamp its version — bwPayload() stamps it on the
         next real bodyweight entry. One less boot write, no content at stake. */
      out.logChanged = hadLegacy || v3Added.length > 0 || v3Bumped || v4Bumped;
      out.bwChanged = markedBw > 0 || dropped.length > 0;
      out.plansChanged = pres.changed === true;
      out.changed = out.logChanged || out.bwChanged || out.plansChanged;
      return out;
    } catch (err) {
      return {
        log: log, bw: bw, plans: plans,
        changed: false, logChanged: false, bwChanged: false, plansChanged: false,
        notes: [{ level: "error", key: null, msg: "Migration failed, data left untouched: " + (err && err.message) }]
      };
    }
  }

  /* ============================================================== advice
     The verdict engine. Every rule below is written by strength-coach and
     cited by id: P1 (audit §3), H1 (audit §9), S1 (audit §10), and the
     addendum's Z1/Z2/Z3 (zero load), I2 (the increment line) and G1 (the
     too-light step). Where a copy line and a worked example disagree, the
     WORKED EXAMPLE is what ships (WO-003 Decision 5).

     Nothing here reads the DOM, S, or storage, and nothing mutates its
     arguments: `sets` and `prev` go in as references and come out untouched,
     because they ARE the draft and the stored session (B-20, W5). */

  /* Rule Z1 — the completed-set test, as numbers.
     completed(s) = r >= 1 (integer) AND w a finite number >= 0.
     Returns {w, r} as NUMBERS, or null.

     Blankness is decided on the RAW STRING, before any coercion, by
     parseWeight: `+"" === 0` in JavaScript, and reading a forgotten weight
     field as a 0 kg bodyweight set is B-21 reintroduced one layer up
     (strength-coach, addendum Z1, [Certain]). w === 0 IS completed — a rack
     chin is real data. */
  function numSet(x) {
    if (!isObj(x)) return null;
    var pw = parseWeight(x.w), pr = parseReps(x.r);
    if (!pw.ok || !pr.ok) return null;
    return { w: pw.value, r: pr.value };
  }

  /* Every completed set, in logged order, as a NEW array of new objects.
     Nothing that comes out of here aliases the caller's data. */
  function completedSets(sets) {
    if (!Array.isArray(sets)) return [];
    var out = [];
    for (var i = 0; i < sets.length; i++) {
      var n = numSet(sets[i]);
      if (n) out.push(n);
    }
    return out;
  }

  /* Tonnage over the COMPLETED sets only: sum of w*r. A malformed row
     contributes nothing, and a 0 kg set contributes 0 — which is why Rule Z3
     bans this number as a comparison basis when either side is zero-load. */
  function vol(sets) {
    var C = completedSets(sets), t = 0;
    for (var i = 0; i < C.length; i++) t += C[i].w * C[i].r;
    return t;
  }

  /* The heaviest completed set's weight, or 0 when there are none.
     Moved out of index.html unchanged in intent but not in test: the old one
     filtered `+s.w > 0`, so a 0 kg rack chin was invisible to it (B-21/B-32).
     0 here means "nothing loaded", not "no data" — callers that need to tell
     those apart ask completedSets().length. */
  function topSet(sets) {
    var C = completedSets(sets), m = 0;
    for (var i = 0; i < C.length; i++) if (C[i].w > m) m = C[i].w;
    return m;
  }

  /* Nearest 2.5 kg, TIES DOWNWARD (audit §3, WO-003 Decision 4).
     70.875 -> 70 · 94.5 -> 95 · 71.25 -> 70 · 102.5 -> 102.5.
     Garbage in returns NaN rather than 0: a plausible wrong number printed as
     a load is worse than a visibly broken one, and no caller may invent 0 kg
     out of an unreadable value. */
  function round2p5(x) {
    var n = (typeof x === "number") ? x : Number(str(x));
    if (!isFinite(n)) return NaN;
    return Math.ceil(n / 2.5 - 0.5) * 2.5;
  }

  /* Rule P1's working load: the weight he held for EVERY set — min, not max.
     `topSet` recommends off a weight hit once and missed twice (B-08).
     n limits it to the first n completed sets (P1's C). Omit n for all of them.
     Returns null when there are no completed sets: 0 is a legal load, so it
     can never double as "no data".

     `n` CAPS, IT DOES NOT REQUIRE. One completed set of three comes back as a
     load. That is safe inside verdict(), which gates on `C.length < ex.s`
     before it ever gets here, and it is NOT safe for any rule that reads
     HISTORY, where a half-finished session would hand back a confident number
     off one set — B-24 walking back in through the side door. Anything reading
     stored sessions uses workingLoadStrict. */
  function workingLoad(sets, n) {
    var C = completedSets(sets);
    if (typeof n === "number" && isFinite(n) && n >= 0) C = C.slice(0, n);
    if (!C.length) return null;
    var m = C[0].w;
    for (var i = 1; i < C.length; i++) if (C[i].w < m) m = C[i].w;
    return m;
  }

  /* workingLoad with the requirement `n` does not carry: null unless there are
     at least n completed sets. Use this on stored sessions — a prescription
     read off a session he abandoned after one set is a wrong number with no
     tell. (ST1/W9 needs no load at all, so it does not call this; W12's speed
     load and W19's "a load previously completed for the full prescription"
     both do.) */
  function workingLoadStrict(sets, n) {
    if (typeof n !== "number" || !isFinite(n) || n < 1) return null;
    if (completedSets(sets).length < n) return null;
    return workingLoad(sets, n);
  }

  /* Epley estimated 1RM: w * (1 + r/30). Audit §4 (ST1).
     Returns null on anything unreadable. It does NOT apply ST1's `r <= 8`
     filter — that is ST1's window, not the formula's, and W9 applies it.
     w === 0 gives 0, so an all-bodyweight lift can never produce a 0/0 ratio
     (addendum §5); W9 must exclude zeros before dividing.

     NEVER PRINT THIS NUMBER. e1rm(100, 1) is 103.3, and one rep at 100 kg is a
     100 kg single. That is the formula the audit specifies, character for
     character, so it stays — inside ST1 it is harmless, because both blocks
     inflate by the same factor and the ordering it produces is the ordering
     that matters. It only bites when a value is DISPLAYED as a strength
     estimate. W10, and anything after it, renders lift names, not this. */
  function e1rm(w, r) {
    var pw = parseWeight(w), pr = parseReps(r);
    if (!pw.ok || !pr.ok) return null;
    return pw.value * (1 + pr.value / 30);
  }

  /* Rule S1 — the pain flag. The audit's regex, unchanged.
     "no pain today" matches: an accepted false positive (audit §10), whose
     whole cost is one held session. "painting" does not — \b sees the word.
     Called on COMMIT only: per keystroke, "painting" passes through "pain". */
  var PAIN_RE = /\b(pain|hurt|hurts|injur\w*|sharp|pinch\w*|tweak\w*|strain\w*)\b/i;
  function painFlag(note) {
    return typeof note === "string" && PAIN_RE.test(note);
  }

  /* Rule Z2 — every load token in every rule goes through this.
     The string "0 kg" must never be produced by any rule: you cannot subtract
     load from a body, and "Drop to 0 kg" reads as a broken app.
     `bodyweight` for a bodyweight-tagged slot, `zero load` for anything else
     at zero (a mis-logged machine set must not read as a claim about his body).
     An untagged slot is treated as "any other implement" — the tag is I1's,
     and until a slot carries one the fallback is the word that says nothing
     about him. */
  function loadWord(w, implement) {
    var p = parseWeight(w);
    if (!p.ok) return "";
    if (p.value > 0) return r1(p.value) + " kg";
    return implement === "bodyweight" ? "bodyweight" : "zero load";
  }

  /* Rule I2 — the "if 2.5 kg is not available" line, as its own second line.
     db · machine · cable · bodyweight only. NEVER bb (a 1.25 kg plate per side
     makes 2.5 kg, so the line is simply false there) and never on speed work.
     The rep ceiling is ex.hi + 2, not the audit's literal 7 — 7 is hi+2 for a
     3–5 slot and two reps BELOW the range on a 6–10 one. Hypertrophy carries
     no number: H1 case 2 triggers on `every r > hi` with no ceiling, and
     inventing one would be prescribing a rep range. */
  function incrementLine(ex) {
    if (!isObj(ex) || ex.k === "speed") return "";
    var im = ex.implement;
    if (im !== "db" && im !== "machine" && im !== "cable" && im !== "bodyweight") return "";
    var unit = (im === "db") ? "2.5 kg per DB" : "2.5 kg";
    if (ex.k === "power") return "If " + unit + " is not available, add reps up to " + (ex.hi + 2) + " first, then jump.";
    return "If " + unit + " is not available, add reps first, then jump.";
  }

  /* Rule G1 — the step when a load is too light. P1 case 3 generalised:
     2.5% of the load per rep above the top of the range, floored at one
     increment and capped at 20% of the load in one jump.
       SLDL 120, hi 8, min r 10 -> 5 -> 125 kg   (reproduces audit §3 ex.5)
       Cable row 30, hi 12, min r 20 -> 5 -> 35 kg (NOT the audit's stray 42.5)
       60, hi 12, min r 13 -> floor -> 62.5 kg
       load 0 -> every multiplicative term is 0 -> 2.5
     The cap is rounded to the 2.5 grid as well, so no rule can print an
     off-grid kg (Decision 4). That only binds where the alternative was an
     unroundable number, and it binds downward. */
  function g1Step(load, mr, hi) {
    if (typeof load !== "number" || !isFinite(load) || load < 0) return NaN;
    var excess = mr - hi;
    if (!(excess > 0)) excess = 0;
    var raw = round2p5(load * 0.025 * excess);
    var cap = round2p5(load * 0.20);
    return Math.max(2.5, Math.min(raw, cap));
  }

  /* ------------------------------------------------------- verdict copy */

  function r1(x) { return Math.round(x * 10) / 10; }
  function kg(x) { return String(r1(x)); }
  function repWord(n) { return n + (n === 1 ? " rep" : " reps"); }
  /* 1740 -> "1,740". Built by hand, not toLocaleString: the separator has to
     be the same character on every phone and in every test. */
  function grp(n) {
    var s = String(Math.round(n)), out = "", i, c = 0;
    for (i = s.length - 1; i >= 0; i--) {
      out = s.charAt(i) + out;
      if (++c % 3 === 0 && i > 0) out = "," + out;
    }
    return out;
  }
  function cap1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function mk(t, x, x2, rule) { return { t: t, x: x, x2: x2 || "", rule: rule }; }
  function incOf(ex) {
    return (isObj(ex) && typeof ex.inc === "number" && isFinite(ex.inc) && ex.inc > 0) ? ex.inc : 2.5;
  }
  function allZero(C) {
    if (!C.length) return false;
    for (var i = 0; i < C.length; i++) if (C[i].w !== 0) return false;
    return true;
  }
  function anyZero(C) {
    for (var i = 0; i < C.length; i++) if (C[i].w === 0) return true;
    return false;
  }
  function minRep(C) {
    var m = C[0].r;
    for (var i = 1; i < C.length; i++) if (C[i].r < m) m = C[i].r;
    return m;
  }
  function maxW(C) {
    var m = C[0].w;
    for (var i = 1; i < C.length; i++) if (C[i].w > m) m = C[i].w;
    return m;
  }
  function minW(C) {
    var m = C[0].w;
    for (var i = 1; i < C.length; i++) if (C[i].w < m) m = C[i].w;
    return m;
  }
  function sumR(C) {
    var t = 0;
    for (var i = 0; i < C.length; i++) t += C[i].r;
    return t;
  }
  function volOf(C) {
    var t = 0;
    for (var i = 0; i < C.length; i++) t += C[i].w * C[i].r;
    return t;
  }

  /* Case 1 of both P1 and H1 drops 5% — and at zero load there is nothing to
     remove (Z2 delta 1). The app does not invent a way to make the movement
     easier: no band, no rack height, no substitute exercise. It holds.
     Returns the sentence WITHOUT its final punctuation on the drop branch, so
     P1 can end it "next session." and H1 can end it "." — the two rules print
     different tails off the same arithmetic. */
  function tooHeavy(ex, C, rangeWord) {
    var im = ex.implement, w0 = C[0].w;
    var drop = round2p5(w0 * 0.95);
    var head = repWord(C[0].r) + " at " + loadWord(w0, im) + ". Below the " + rangeWord + ".";
    if (!(drop > 0)) {
      return mk("", head + " Hold here until all " + ex.s + " sets reach " + ex.lo + " reps.", "", "1z");
    }
    return mk("down", head + " Drop to " + kg(drop) + " kg", "", "1");
  }

  /* -------------------------------------------------------------- P1 */

  /* Rule P1 — power-day progression (audit §3), with Z1/Z2/G1/I2/S1.
     C is the first ex.s completed sets, already sliced by verdict(). */
  function verdictPower(ex, C, pain) {
    var im = ex.implement;
    var lo = ex.lo, hi = ex.hi, s = ex.s;
    var load = minW(C), top = maxW(C);
    var equal = (top - load) <= 0.01;
    var word = loadWord(load, im);
    var hold = mk("", "Stay at " + word + " until all " + s + " sets reach " + hi + " reps.", "", "P1.5");

    /* 1 — too heavy. Beats case 2 deliberately: a mismatch is a symptom of the
       load being wrong, and the useful instruction is about the load. */
    if (C[0].r < lo) {
      var th = tooHeavy(ex, C, "range");
      return mk(th.t, th.rule === "1" ? th.x + " next session." : th.x, "", "P1." + th.rule);
    }

    /* 2 — the sets were not matched. Repeat the heaviest, which by
       construction can never be 0: if it were, every set would be 0 and
       `equal` would be true, so this branch could not have fired. */
    if (!equal) {
      var list;
      if (anyZero(C)) {
        list = C.map(function (x) { return loadWord(x.w, im); }).join(" / ");
      } else {
        list = C.map(function (x) { return kg(x.w); }).join(" / ") + " kg";
      }
      return mk("down", "Sets not matched: " + list + ". Repeat " + loadWord(top, im) +
        " until all " + s + " sets reach " + hi + " reps.", "", "P1.2");
    }

    var mr = minRep(C);

    /* 3 — too light, by Rule G1's step. Suppressed by a pain note (Rule S1):
       every increase downgrades to the hold. */
    if (mr >= hi + 2) {
      if (pain) return hold;
      var step = g1Step(load, mr, hi);
      var head3 = repWord(mr) + " at " + word + " on every set. Too light. ";
      return mk("up", head3 + (load === 0 ? "Add " + kg(step) + " kg." : "Go to " + kg(load + step) + " kg."),
        incrementLine(ex), "P1.3");
    }

    /* 4 — top of the range on every set. Also suppressed by a pain note. */
    if (mr >= hi) {
      if (pain) return hold;
      var inc = incOf(ex);
      return mk("up", load === 0
        ? "Top of range on all " + s + " sets at " + word + ". Add " + kg(inc) + " kg next session."
        : "Top of range on all " + s + " sets. Go to " + kg(load + inc) + " kg next session.",
        incrementLine(ex), "P1.4");
    }

    /* 5 — hold. One rep short is not a rounding error. */
    return hold;
  }

  /* -------------------------------------------------------------- H1 */

  /* Rule H1 — hypertrophy verdict (audit §9), with Z1/Z2/Z3/G1/I2/S1.
     Cprev is the previous entry's first ex.s completed sets, or null. */
  function verdictHyp(ex, C, Cprev, pain) {
    var im = ex.implement;
    var lo = ex.lo, hi = ex.hi, s = ex.s;
    var range = lo + "–" + hi + " range";
    var load = minW(C), mr = minRep(C);

    /* 1 — too heavy. */
    if (C[0].r < lo) {
      var th = tooHeavy(ex, C, range);
      return mk(th.t, th.rule === "1" ? th.x + "." : th.x, "", "H1." + th.rule);
    }

    /* 2 — every set ABOVE the top of the range (12 is inside 8–12, so it does
       not fire there). This is also the exit from bodyweight: once the reps
       pass hi at zero load, external load appears and from the next session it
       is an ordinary loaded exercise (addendum Z3). Suppressed by a pain note,
       which falls through to the comparison rather than inventing hold copy
       for a branch the audit gives none for. */
    if (mr > hi && !pain) {
      var step = g1Step(load, mr, hi);
      return mk("up", load === 0
        ? "All sets above " + hi + " at " + loadWord(load, im) + ". Add " + kg(step) + " kg next session."
        : "All sets above " + hi + ". Go to " + kg(load + step) + " kg next session.",
        incrementLine(ex), "H1.2");
    }

    /* 3 — no comparable previous entry, split by WHY (addendum §7.7 N3).
       `First time logged` on an exercise with months of history is simply
       false, and it fired the whole week after every deload (2-set entries
       against a restored s of 3) and after every abandoned session. The app
       says which of the two it is.

       The split is `Cprev.length === 0` -> 3a, `0 < Cprev.length < ex.s` -> 3b.
       An entry that recorded no completed set is indistinguishable from no
       entry at all — it may be a NOTES-ONLY entry, which Decision 7 and TW1
       both already treat as not a training record. 3b's copy asserts `Last
       logged session was short`, and claiming that would be the app describing
       a session it cannot see. 3a's `First time logged` is true of the thing
       being compared: no set has ever been logged for that exercise.

       Deliberately NOT "look further back for a comparable entry" — comparing
       this week to a session three weeks old and printing `Volume up 4%` is a
       comparison across a gap the copy does not disclose. */
    if (!Cprev || Cprev.length === 0) {
      return mk("", "First time logged. This becomes your baseline.", "", "H1.3a");
    }
    if (Cprev.length < s) {
      return mk("", "Last logged session was short. Not comparable. This becomes your baseline.", "", "H1.3b");
    }

    /* 4 — Rule Z3. Tonnage is banned when EITHER side is zero-load: it is
       undefined as a ratio, and today it prints `Volume up 0% — 75 kg against
       0 kg`. Reps and tonnage are never compared against each other. */
    var cur = allZero(C), prv = allZero(Cprev);
    var zword = loadWord(0, im);

    if (cur && prv) {                                    /* 4a — total reps */
      var a = sumR(C), b = sumR(Cprev);
      if (a > b) return mk("up", "Reps up: " + a + " against " + b + " at " + zword + ".", "", "H1.4a");
      if (a < b) return mk("down", "Reps down: " + a + " against " + b + " at " + zword + ". Match it next session.", "", "H1.4a");
      return mk("", "Same reps at " + zword + ": " + a + ". Add one rep next session.", "", "H1.4a");
    }
    if (cur) {                                           /* 4b — basis change */
      return mk("", cap1(zword) + " this time, loaded last time. Not comparable. New " + zword + " baseline.", "", "H1.4b");
    }
    if (prv) {                                           /* 4c — basis change */
      /* The load he held for every set, unless that is 0 on a mixed session —
         then the number that describes "added load" is the top one. */
      var base = load > 0 ? load : maxW(C);
      return mk("", "Added load since last session. New baseline at " + kg(base) + " kg.", "", "H1.4c");
    }

    var va = volOf(C), vb = volOf(Cprev);                 /* 4d — tonnage */
    var p = vb > 0 ? Math.round((va - vb) / vb * 100) : 0;
    if (va > vb) return mk("up", "Volume up " + p + "% — " + grp(va) + " kg against " + grp(vb) + " kg.", "", "H1.4d");
    if (va < vb) return mk("down", "Volume down " + Math.abs(p) + "%. Add a rep or 2.5 kg next time.", "", "H1.4d");
    return mk("", "Volume matched. One more rep next session.", "", "H1.4d");
  }

  /* ------------------------------------------------------------- DL1 */

  /* Rule DL1 (addendum §7.7 N1) — the verdict during an ACTIVE deload week.

     THE BUG THIS CLOSES. deloadEx makes a 3–5 squat {s:2, lo:3, hi:3}. He does
     exactly what the banner told him — 100×3, 100×3 — and P1 case 4 fires:
     `Top of range on all 2 sets. Go to 102.5 kg next session.` A load increase
     produced by OBEDIENCE, on every power slot of every deload week. The rest
     of the branch is wrong the same week for smaller reasons: case 5 would
     print a progression target that does not exist, case 1 would contradict
     the deload's own "do not reduce the weight", and H1 case 4 would compare a
     deliberately reduced block to a full one.

     So this does not patch four branches, it REPLACES the output. No P1 case,
     no H1 case, no I2 second line, no comparison, no percentage. Meeting a
     prescription that was deliberately set below his capacity is not evidence
     he is ready to add load.

     Working load is the min of the first ex.s completed sets as always, and it
     prints through loadWord, so a bodyweight slot reads
     `Stay at bodyweight` and the substring `0 kg` is never produced (Rule Z2).

     A pain note still renders its own §10 notice on the card. DL1 neither
     suppresses it nor repeats it, which is why `pain` is not read here. */
  function verdictDeload(ex, C) {
    return mk("", "Deload week. Stay at " + loadWord(minW(C), ex.implement) +
      ". Nothing to add until full sets resume.", "", "DL1");
  }

  /* ---------------------------------------------------------- verdict */

  /* verdict(ctx) -> {t, x, x2, rule} | null

     ctx = { ex, sets, prev, note, painFlag }
       ex        {id, n, s, lo, hi, k, inc?, implement?}          required
       sets      this exercise's sets, strings or numbers          required
       prev      the previous ENTRY for this id ({sets, note}), an array of
                 sets, or null. PHAT.lastFor(sessions, id) returns the right
                 thing. Read by k:"hyp" only.
       note      this exercise's note, read only through Rule S1's regex
       painFlag  optional Boolean; overrides `note` when present, so a caller
                 can hold a committed flag while the field is still being typed
       deload    optional Boolean; true when deloadStatus().active is true for
                 the session's date. Threaded exactly like painFlag, because it
                 is the same mechanism for the same reason: a fact about today
                 that only the caller can know, passed in rather than read out
                 of storage by a pure function (Rule DL1)

     THE DELOADED PRESCRIPTION IS DERIVED HERE, NOT TRUSTED FROM THE CALLER.
     With `deload:true` this applies deloadEx() to ctx.ex itself, so the gate
     and the verdict are computed against the SAME object the card renders
     whether the caller passed the programme exercise or the deloaded one.
     deloadEx is idempotent (it refuses to re-deload its own output), so the
     two call shapes converge instead of lowering `hi` twice. That removes the
     one way this function could be handed the wrong prescription — the
     converse constraint, that the deloaded ex must reach NOTHING ELSE, is
     enforced in deloadCheck (addendum §7.4).

     One context object, not an argument list: S1, V1 and R1 all add inputs to
     this function at different points in this batch, and three signature
     changes to the app's most advice-critical function are three chances to
     drop an argument silently (WO-003 Decision 3).

     THE GATE (B-24). Below `ex.s` COMPLETED sets there is no verdict at all —
     null, for every role. `Volume down 66%` after set 1 of 3 is read between
     sets as an instruction about the set he is about to do. The caller renders
     a fixed reminder in its place; that copy belongs to the UX spec, not here.

     Extra sets beyond ex.s are ignored, on both sides of a comparison, so the
     two sides are always the same size (audit §3).

     The returned `rule` names the branch that fired (`P1.4`, `H1.4a`, …) so a
     test can pin case selection separately from copy. `x2` is Rule I2's second
     line, "" when there is none — it is a LINE, never appended to x's
     sentence.

     PURITY: returns a new object built from new numbers. `ctx`, `ctx.sets` and
     `ctx.prev` are never written to, and nothing here reads or writes storage.
     It does not throw on bad input; it returns null. */
  function verdict(ctx) {
    if (!isObj(ctx)) return null;
    if (!isObj(ctx.ex)) return null;
    var dl = (ctx.deload === true);
    var ex = dl ? deloadEx(ctx.ex, true) : ctx.ex;
    var s = ex.s;
    if (typeof s !== "number" || !isFinite(s) || s < 1) return null;

    var C = completedSets(ctx.sets);
    if (C.length < s) return null;                 /* B-24 — the gate */
    C = C.slice(0, s);

    if (ex.k === "speed") {
      /* RULE SP0 IS GONE (WO-004 W3, UX spec §4.7 finding 4). It used to return
         `Submaximal and fast. Do not grind these.` — a sentence WO-003 §4.2
         replaced with speedLoad().instruction. The view stopped calling it, so
         it was unreachable rather than wrong, and an unreachable second opinion
         about speed work is exactly what the next caller finds and ships.

         SILENCE, NOT A SECOND SENTENCE. There is one source for what to say on
         a speed card and it is PHAT.speedLoad(): `text` for the load and
         `instruction` for how to move it, both ungated, both permanent. This
         function has nothing to add and says so by returning null.

         Speed work is also unchanged by a deload (audit §8), so DL1 never
         reaches it — the return is above the DL1 branch for that reason. */
      return null;
    }

    /* Rule DL1. Above verdictPower and verdictHyp, which are not exported and
       are called from nowhere else — so during an active deload no P1 case and
       no H1 case is reachable by any path. */
    if (dl) return verdictDeload(ex, C);

    var pain = (typeof ctx.painFlag === "boolean") ? ctx.painFlag : painFlag(ctx.note);

    if (ex.k === "power") return verdictPower(ex, C, pain);

    var praw = ctx.prev;
    if (isObj(praw) && Array.isArray(praw.sets)) praw = praw.sets;
    var Cprev = Array.isArray(praw) ? completedSets(praw).slice(0, s) : null;
    return verdictHyp(ex, C, Cprev, pain);
  }

  /* ==================================================== Rule W1 - W7
     Bodyweight windows and the calorie decision. audit section 2, UX spec
     section 3. Weight tab only; no training role.

     WHAT THIS REPLACES, and why it is the most dangerous function in the file.
     vWeight() averages the last seven ENTRIES - `b.slice(-7)` against
     `b.slice(-14,-7)` - so eight weigh-ins spread over five weeks produce a
     confident "weekly change" of +1.2 kg (B-06). It then acts on it four
     different wrong ways:
       - cuts 200 kcal anywhere above +0.35, where the brief says change
         nothing below +0.50. Telling a bulking lifter gaining 0.4 kg a week
         to eat less is a direct hit to the goal;
       - adds 200 kcal below +0.20, where the brief's trigger is FLAT. A
         measured +0.15 is inside the noise of two weekly averages;
       - prints "Gaining too slowly" while he is LOSING weight;
       - prints "Target: 0.2-0.3 kg per week" directly under logic that
         treats 0.34 as on target.
     Every one of those is acted on with food.

     Windows are seven local CALENDAR DATES, never seven rows:
       B = [today-6 .. today]      A = [today-13 .. today-7]
     with at least five distinct dated entries in EACH. Below that there is no
     rate and no advice - "not enough data" is the correct output. Day-to-day
     bodyweight noise on a 180 cm male is +/-0.5-1.0 kg of water, sodium, gut
     content and glycogen, so acting on a 0.15 kg week-over-week difference is
     chasing noise with a 200 kcal lever.

     Pure: no DOM, no S, no storage. `entries` is read, never written to, never
     sorted in place, and every row that comes out is a new object. */

  var BW_MIN = 5;            /* distinct dated entries needed in EACH window */
  var BW_WINDOW = 7;         /* dates per window */
  var BW_HISTORY = 14;       /* days of history before this is a decision */
  var CAL_COOLDOWN = 7;      /* days a calorie change is held */
  var BW_SUBLINE = "Target: +0.2 to +0.3 kg per week. Averages over 14 days.";

  function round2(x) {
    var n = Math.round(x * 100) / 100;
    return n === 0 ? 0 : n;                 /* never hand out -0 */
  }

  /* A bodyweight reading, or null. Accepts the stored number and a numeric
     string, because the store has carried both. Requires finite and > 0: a
     bodyweight of 0 is not a measurement.

     No upper bound is invented here. index.html's write path already refuses
     anything outside 30-300 kg, so an out-of-range row can only arrive by
     import, and silently dropping an imported row is as wrong as silently
     averaging it. If a range check belongs anywhere it belongs at the write
     and import boundary, loudly. */
  function bwKg(v) {
    if (typeof v !== "number" && str(v).trim() === "") return null;
    var n = (typeof v === "number") ? v : Number(str(v).trim());
    if (!isFinite(n) || !(n > 0)) return null;
    return n;
  }

  /* The bodyweight store as {date, kg} rows this rule can read: one row per
     distinct local date, ascending, nothing dated after today.

     Two rows on one date keep the LAST in array order - the same rule
     migrateStore uses when it dedupes the store, so the average and the disk
     can never disagree about which reading counts.

     A future-dated row is not evidence of a weight he has been yet, so it is
     excluded from the windows. It is NOT removed, edited or reported as bad:
     this function returns a view, and nothing here writes anything. */
  function bwRows(entries, today) {
    var out = [];
    if (!Array.isArray(entries)) return out;
    var by = {}, i, e, d, k;
    for (i = 0; i < entries.length; i++) {
      e = entries[i];
      if (!isObj(e)) continue;
      d = str(e.date).trim();
      if (!DATE_RE.test(d)) continue;
      if (d > today) continue;
      k = bwKg(e.kg);
      if (k === null) continue;
      by[d] = k;
    }
    Object.keys(by).sort().forEach(function (dd) { out.push({ date: dd, kg: by[dd] }); });
    return out;
  }

  function bwMean(rows) {
    if (!rows.length) return null;
    var t = 0;
    for (var i = 0; i < rows.length; i++) t += rows[i].kg;
    return t / rows.length;
  }

  /* +0.34 / -0.05 / +0.00 - always signed, always two decimals (UX spec 3.2). */
  function signed2(r) {
    var n = round2(r);
    return (n < 0 ? "-" : "+") + Math.abs(n).toFixed(2);
  }
  /* 0.35 - unsigned, for the losing copy, which carries the sign in the word
     "Down". */
  function abs2(r) { return Math.abs(round2(r)).toFixed(2); }

  /* bwWindows(entries, todayStr)
       -> {a, b, aCount, bCount, meanA, meanB, rate}

     a / b   the rows inside each window, ascending, as NEW objects
     aCount  distinct dated entries in A          bCount  the same for B
     meanA   mean kg over A, rounded to 2dp, or null when A is empty
     rate    meanB - meanA in kg per week, rounded to 2dp, or NULL unless BOTH
             windows hold at least BW_MIN entries.

     `rate` is null - not a number nobody may use - precisely so no caller can
     print a weekly rate off two entries. It is computed from the UNROUNDED
     means and rounded once; window A's mean is never displayed, so there is no
     pair of numbers on screen this can contradict. */
  function bwWindows(entries, todayStr) {
    var today = safeToday(todayStr);
    var rows = bwRows(entries, today);
    var bFrom = dateAdd(today, -(BW_WINDOW - 1));
    var aFrom = dateAdd(today, -(2 * BW_WINDOW - 1));
    var aTo = dateAdd(today, -BW_WINDOW);
    var a = [], b = [], i, d;
    for (i = 0; i < rows.length; i++) {
      d = rows[i].date;
      if (bFrom !== null && d >= bFrom && d <= today) b.push({ date: d, kg: rows[i].kg });
      else if (aFrom !== null && aTo !== null && d >= aFrom && d <= aTo) a.push({ date: d, kg: rows[i].kg });
    }
    var rawA = bwMean(a), rawB = bwMean(b);
    return {
      a: a, b: b, aCount: a.length, bCount: b.length,
      meanA: rawA === null ? null : round2(rawA),
      meanB: rawB === null ? null : round2(rawB),
      rate: (a.length >= BW_MIN && b.length >= BW_MIN) ? round2(rawB - rawA) : null
    };
  }

  /* calCooldown(calChangedAt, todayStr) -> {active, daysAgo, holdUntil}

     The 7-day hold after he acknowledges a calorie change. An unusable or
     absent stamp is simply no cooldown - it can never become one.

     A stamp dated in the FUTURE counts as active. Clock skew or a bad import
     must not open a window in which the app hands out a second calorie change;
     suppressing advice is the safe direction, giving it is not. */
  function calCooldown(calChangedAt, todayStr) {
    var today = safeToday(todayStr);
    var out = { active: false, daysAgo: null, holdUntil: null };
    var d = str(calChangedAt).trim();
    if (!DATE_RE.test(d)) return out;
    var gap = dayGap(d, today);
    if (gap === null) return out;
    out.daysAgo = gap;
    out.holdUntil = dateAdd(d, CAL_COOLDOWN);
    out.active = gap < CAL_COOLDOWN;
    return out;
  }

  /* "today" / "1 day ago" / "3 days ago" - UX spec 3.2. `0 days ago` and
     `1 days ago` both read as a broken app. A negative gap (a future stamp)
     reads as today rather than inventing "in 2 days". */
  function agoWord(n) {
    if (typeof n !== "number" || !isFinite(n) || n <= 0) return "today";
    return n === 1 ? "1 day ago" : n + " days ago";
  }

  /* calorieAdvice(entries, todayStr, calChangedAt)
       -> {state, rate, text, subline, tone, aCount, bCount, meanA, meanB,
           daysAgo, holdUntil}

     state, one of eleven:
       "empty"          no usable entry at all. text "" - the tab keeps its own
                        sub-line and renders no panel (audit 2, spec 3.3 D)
       "need-history"   fewer than 14 days between the first entry and today
       "thin-window-b"  window B below 5 entries
       "thin-window-a"  window B fine, window A below 5
       "cut" "above" "on-target" "below" "flat" "losing"   the six bands
       "cooldown"       a change was acknowledged less than 7 days ago AND the
                        band would have instructed him to change something

     rate is a number ONLY in the six bands and in cooldown; it is null in
     every not-enough-data state, and so is subline, so no field of the
     returned object can carry a kg-per-week number the data does not support.

     tone, for the renderer, not for colour on the rate itself (spec 3.1 r3):
       "ok"    on target
       "hold"  above / below / cooldown - no action, and nothing to acknowledge
       "act"   cut / flat / losing - the three states that instruct a change.
               tone === "act" is exactly when the acknowledgement control
               renders (spec 3.5), so the UI never has to re-derive that list.
       "none"  the four not-enough-data states

     ORDER OF THE GATES, which is load-bearing: history span first, then
     window B, then window A. It is reachable to hold 5 entries in each window
     with only 12 days of history (t-11..t-7 and t-6..t-2), and the protocol is
     weigh daily, run 14 days, THEN decide. The history gate wins.

     COOLDOWN RANKING (spec 3.2): state 7 outranks 1, 5 and 6 - the three that
     say add or cut - and does NOT outrank 2, 3 and 4, which instruct nothing.
     So a cooldown while the rate reads +0.34 still prints the +0.34 line.

     Pure: reads `entries`, writes nothing, touches no storage, and stamping
     the cooldown is a separate explicit call (setCalChanged). */
  function calorieAdvice(entries, todayStr, calChangedAt) {
    var today = safeToday(todayStr);
    var W = bwWindows(entries, today);
    var out = {
      state: "empty", rate: null, text: "", subline: "", tone: "none",
      aCount: W.aCount, bCount: W.bCount, meanA: W.meanA, meanB: W.meanB,
      daysAgo: null, holdUntil: null
    };

    var rows = bwRows(entries, today);
    if (!rows.length) return out;                       /* spec 3.3 D */

    var span = dayGap(rows[0].date, today);
    span = (span === null) ? 0 : span + 1;              /* inclusive of both ends */
    if (span < BW_HISTORY) {
      out.state = "need-history";
      out.text = "Weigh daily. " + (BW_HISTORY - span) +
                 " more days before this becomes a calorie decision.";
      return out;
    }
    if (W.bCount < BW_MIN) {
      out.state = "thin-window-b";
      out.text = "Not enough daily weights. " + W.bCount +
                 " of the last 7 days logged; this needs " + BW_MIN + ".";
      return out;
    }
    if (W.aCount < BW_MIN) {
      /* "those" and not "the last" - it is the week before last (spec 3.3 C). */
      out.state = "thin-window-a";
      out.text = "Not enough daily weights. " + W.aCount +
                 " of those 7 days logged; this needs " + BW_MIN + ".";
      return out;
    }

    var r = W.rate;
    /* Not reachable: both counts passed the minimum, so bwWindows returned a
       number. Kept so that no later change can fall through into the band
       ladder holding a null and print an advice sentence about NaN. Failing
       to the empty state means no panel and no instruction. */
    if (r === null) return out;

    /* Bands compared in integer hundredths of a kg. The rate is already
       rounded to 2dp, so the number he reads and the band he lands in can
       never disagree - +0.5049 must not print "+0.50" and cut his food. */
    var c = Math.round(r * 100);
    var band, tone, text;
    if (c > 50) {
      band = "cut"; tone = "act";
      text = "Gaining too fast at " + signed2(r) + " kg per week. Cut 200 kcal from training days.";
    } else if (c > 30) {
      band = "above"; tone = "hold";
      text = signed2(r) + " kg per week. Above target, inside the margin. Change nothing. Recheck in 7 days.";
    } else if (c >= 20) {
      band = "on-target"; tone = "ok";
      text = signed2(r) + " kg per week. On target. Change nothing.";
    } else if (c >= 10) {
      band = "below"; tone = "hold";
      text = signed2(r) + " kg per week. Below target but inside weekly noise. Change nothing. Recheck in 7 days.";
    } else if (c >= -10) {
      band = "flat"; tone = "act";
      text = "Flat at " + signed2(r) + " kg per week. Add 200 kcal to your training days.";
    } else {
      band = "losing"; tone = "act";
      text = "Down " + abs2(r) + " kg this week. You are not bulking. Add 200 kcal to your training days.";
    }

    out.rate = r;
    out.subline = BW_SUBLINE;

    var cd = calCooldown(calChangedAt, today);
    if (cd.active) {
      out.daysAgo = cd.daysAgo;
      out.holdUntil = cd.holdUntil;
      if (tone === "act") {
        out.state = "cooldown";
        out.tone = "hold";
        out.text = "You changed calories " + agoWord(cd.daysAgo) +
                   ". Hold until " + dayMon(cd.holdUntil) + " before changing again.";
        return out;
      }
    }

    out.state = band;
    out.tone = tone;
    out.text = text;
    return out;
  }

  /* setCalChanged(state, todayStr) / clearCalChanged(state)
       -> a NEW state object, or null.

     The stamp and - equally important - the way back out. UX spec 3.5 lists
     the clearer as blocking: a setter without one means a single absent-minded
     tap silences calorie advice for seven days with no way to undo it, which
     is exactly the class of thing this app is not allowed to do. Setting takes
     two deliberate taps; clearing takes one, because clearing restores advice
     and the cheap direction must be the safe one.

     Both are idempotent, both copy, neither mutates `state`, and neither
     touches any other key: sessions, notes and the stored `includeCut` come
     out byte-identical.

     null when `state` is not an object, and the caller MUST NOT write null
     over the store. A missing store is a bug upstream; inventing a fresh one
     here would hand the writer an object with no sessions in it. */
  function setCalChanged(state, todayStr) {
    if (!isObj(state)) return null;
    var out = {};
    Object.keys(state).forEach(function (k) { out[k] = state[k]; });
    out.calChangedAt = safeToday(todayStr);
    return out;
  }

  function clearCalChanged(state) {
    if (!isObj(state)) return null;
    var out = {};
    Object.keys(state).forEach(function (k) { out[k] = state[k]; });
    out.calChangedAt = null;
    return out;
  }

  /* =================================================== Rule ST1 - W9
     Stall detection. audit section 4, with the counting ruling in addendum
     section 6c. The four key lifts only, on the Trend screen. Never applied to
     hypertrophy or 15-20 rep work.

     WHAT THIS REPLACES. vTrend reads topSet - the heaviest WEIGHT - across all
     history and fires when `Math.max(...hits) <= hits[0]`. PHAT and Rule P1
     both make him fill the rep range BEFORE the bar moves, so week 1 Row
     100x3/3/3 and week 6 Row 100x5/5/5 - six added reps at his top load, one
     session away from a 2.5 kg jump - is `100 <= 100`, and the app tells him
     the sets are not close enough to failure or he is not eating enough. The
     app punishing him for obeying it. Second flaw: the baseline never moves,
     so at week 30 it is still comparing against session one and the check is
     dead forever once he has ever added weight.

     Fixed by changing the MEASURE and the WINDOW, keeping the brief's four
     lifts and its week-6 timing:
       score  = Epley e1RM, w * (1 + r/30), over completed sets only
       recent = [today-20 .. today]     prior = [today-41 .. today-21]
       gates  = trainingWeeks >= 6 AND >= 2 distinct dates per block per lift
       pass   = max(recent) >= max(prior) * 1.025
     2.5% over six weeks is a deliberately low bar. Failing it is a finding.

     COUNTING. "2 sessions per block" means 2 DISTINCT LOCAL DATES
     (strength-coach, addendum 6c). Two Squat entries saved on one date are one
     observation; counting them twice lets a single re-saved session unlock a
     stall verdict, and B-05 is still open, so corrections arrive as extra rows
     before they arrive as edits.

     NEVER DISPLAY AN e1RM. e1rm(100, 1) returns 103.3, and one rep at 100 kg
     is a 100 kg single, not 103.3. The formula is the audit's, character for
     character, and it is harmless HERE because both blocks inflate by the same
     factor and the comparison is monotonic - it only bites when a number is
     printed. W10 renders lift NAMES. If any later item wants a strength
     estimate on screen, that is a new rule and it goes to strength-coach
     first.

     Pure: `sessions` is read, never mutated, never sorted in place, and no
     storage is touched. */

  var ST1_WEEKS = 6;         /* trainingWeeks gate - TW1, not weeksIn() */
  var ST1_DATES = 2;         /* distinct dates per block per lift */
  var ST1_REPS = 8;          /* above this the estimate is not trustworthy */
  var ST1_RATIO = 1.025;
  var ST1_RECENT = 20;       /* recent block = [today-20 .. today] */
  var ST1_PRIOR_FROM = 41;   /* prior block  = [today-41 .. today-21] */
  var ST1_PRIOR_TO = 21;

  /* The shipped plan's four key lifts, compiled from the document (W3), joined
     to their slots so the NAME ST1 says is the name on the card. Exported for
     a caller that has no plan in hand; index.html's KEY_LIFTS keeps its chart
     colours, which are a view concern and are not programme data. */
  var KEY_LIFTS = deepFreeze(planKeyLifts(PHAT_PLAN));

  /* Rule C7b's copy (addendum 8.4). Three blocks, and which one is spoken is
     decided by phatProvenance(), never by the caller.

     ST1_ABSENT       the plan names no key lifts. The check is switched OFF,
                      and that is NOT "log more" - he may have a year of data.
     ST1_PHAT_LINES   the brief's diagnosis, unchanged (audit 4). It says the
                      split is not the problem, and that sentence was earned by
                      a coach who assessed THAT split.
     ST1_GENERIC      the same finding on a plan nobody reviewed. Same
                      structure - one finding, candidate causes, change one,
                      three weeks - plus the third cause the PHAT version
                      correctly excludes: the plan itself.

     The MEASUREMENT is stallReport and is not gated. Epley, r <= 8, two 21-day
     blocks, 1.025 - that arithmetic is true on any plan and travels. The
     diagnosis does not. */
  var ST1_ABSENT = [
    "This plan names no key lifts, so the six-week check cannot run.",
    "Name up to four in the plan to switch it on."
  ];
  var ST1_PHAT_LINES = [
    "This is the check we agreed on. The split isn't the problem and neither is the diet.",
    "Either the sets aren't close enough to failure, or you aren't eating enough.",
    "Fix one, not both, and give it three weeks."
  ];
  var ST1_GENERIC_LINES = [
    "Six weeks of data and the numbers have not moved. Change one thing — how hard the sets are, " +
    "how much you are eating, or the plan — and give it three weeks."
  ];
  var ST1_THIN_ALL = "Six weeks in but the log is too thin to test. Log all four lifts weekly.";

  /* One set's ST1 score, or null when the set does not count:
     - not a completed set under Z1 (blank, malformed, out of range);
     - above ST1_REPS reps: the audit excludes them, so a 100x12 back-off set
       contributes nothing and cannot drag a block down;
     - zero load: e1rm(0, r) is 0 for every r, and a 0-against-0 ratio is not a
       stall, it is an absence of data. A key lift at 0 kg is a mis-log. */
  function st1Score(x) {
    var n = numSet(x);
    if (!n) return null;
    if (n.r > ST1_REPS) return null;
    if (!(n.w > 0)) return null;
    return n.w * (1 + n.r / 30);
  }

  /* e1rmByDate(sessions, exId, fromStr, toStr) -> [{date, e}] ascending.

     One row per DISTINCT local date inside [from..to] that carries at least
     one scoring set for that exercise; `e` is the best score on that date
     across EVERY session sharing it. That merge is the addendum 6c ruling made
     concrete: a re-save adds rows, not evidence.

     An omitted or unusable bound is treated as open on that side. New objects
     out; nothing here is a reference into the store. */
  function e1rmByDate(sessions, exId, fromStr, toStr) {
    var out = [];
    if (!Array.isArray(sessions)) return out;
    if (typeof exId !== "string" || exId.trim() === "") return out;
    var id = exId.trim();
    var from = (typeof fromStr === "string" && DATE_RE.test(fromStr.trim())) ? fromStr.trim() : null;
    var to = (typeof toStr === "string" && DATE_RE.test(toStr.trim())) ? toStr.trim() : null;
    var by = {}, i, j, s, d, e, v;
    for (i = 0; i < sessions.length; i++) {
      s = sessions[i];
      d = sessionDate(s);
      if (d === "") continue;
      if (from !== null && d < from) continue;
      if (to !== null && d > to) continue;
      if (!isObj(s.entries)) continue;
      if (!Object.prototype.hasOwnProperty.call(s.entries, id)) continue;
      e = s.entries[id];
      if (!isObj(e) || !Array.isArray(e.sets)) continue;
      for (j = 0; j < e.sets.length; j++) {
        v = st1Score(e.sets[j]);
        if (v === null) continue;
        if (!Object.prototype.hasOwnProperty.call(by, d) || v > by[d]) by[d] = v;
      }
    }
    Object.keys(by).sort().forEach(function (dd) { out.push({ date: dd, e: by[dd] }); });
    return out;
  }

  /* liftDays(sessions, exId, todayStr) -> distinct local dates, ascending, on
     which that exercise carries at least one COMPLETED set (Z1), up to and
     including todayStr.

     trainingDays' per-exercise sibling, and it has to be a separate function:
     trainingDays answers "did he train that day" log-wide and cannot be
     filtered per lift without re-deriving the completed-set test per exercise.
     Every rule that counts EVIDENCE FOR ONE LIFT reads this - ST1's block
     minimum is expressed in scoring dates below, D1's consecutive failures
     will read this one. Dates, not sessions, per addendum 6c.

     Note the difference from e1rmByDate: this counts a date where the lift was
     TRAINED, that one counts a date where the lift produced a usable estimate.
     A session of 100x12 is a training day for the lift and not a data point
     for ST1. */
  function liftDays(sessions, exId, todayStr) {
    var out = [];
    if (!Array.isArray(sessions)) return out;
    if (typeof exId !== "string" || exId.trim() === "") return out;
    var id = exId.trim(), today = safeToday(todayStr);
    var seen = {}, i, j, s, d, e;
    for (i = 0; i < sessions.length; i++) {
      s = sessions[i];
      d = sessionDate(s);
      if (d === "" || d > today) continue;
      if (Object.prototype.hasOwnProperty.call(seen, d)) continue;
      if (!isObj(s.entries)) continue;
      if (!Object.prototype.hasOwnProperty.call(s.entries, id)) continue;
      e = s.entries[id];
      if (!isObj(e) || !Array.isArray(e.sets)) continue;
      for (j = 0; j < e.sets.length; j++) {
        if (isDoneSet(e.sets[j])) { seen[d] = true; break; }
      }
    }
    Object.keys(seen).sort().forEach(function (dd) { out.push(dd); });
    return out;
  }

  function bestE(rows) {
    var m = null;
    for (var i = 0; i < rows.length; i++) if (m === null || rows[i].e > m) m = rows[i].e;
    return m;
  }

  /* stallReport(sessions, todayStr, keyLifts, state)
       -> {stalled, untested, testable}

     state     OPTIONAL. The app state ({deload:…}) or the bare deload object.
               Rule E2: a date inside any deload window contributes no e1RM
               sample to either block and no distinct date to either block's
               2-date minimum. A deload set is the same weight two reps short,
               which is 5.7% down on Epley on a 3-5 slot - more than twice this
               rule's own 2.5% threshold - so left in the pool it manufactures
               the stall the app itself prescribed and then blames his effort
               or his diet for it. Omit it and nothing is excluded, which is
               the pre-E2 behaviour and is correct for a log with no deload in
               it. `testable` is unaffected: TW1 counts a deload week as a week
               he trained (addendum §7.7 N2).

     keyLifts  [{id, n}, ...] - index.html's KEY_LIFTS. WHICH four lifts are
               tested is settled (audit 12) and is NOT decided here; the caller
               passes them, so renaming Bench to DB press (B-27) is a one-line
               change in index.html and this file never sees it.
     stalled   the names of tested lifts that failed the 2.5% bar
     untested  the names of lifts below the block minimum - named separately,
               never merged into stalled. "I cannot tell" is not "you failed".
     testable  trainingWeeks >= 6. False means BOTH lists are empty and the
               renderer shows nothing at all - no placeholder, no "on track"
               reassurance (audit 4).

     Both lists come back in keyLifts order, so the copy reads in the order he
     sees on the chart legend.

     A lift with fewer than 2 scoring dates in EITHER block is untested: two
     points in the recent block and none in the prior one is not a comparison.

     NOT IMPLEMENTED HERE, deliberately: addendum S2c appends one factual line
     when a stalled lift also carries a pain note inside the recent block. It
     needs painWindow(), which is W16's, and the coach marked it deferrable and
     "nothing else breaks if it is cut". When W16 lands, this takes the flagged
     ids as a FIFTH argument - E2's state took the fourth - and W10 renders the
     extra line. */
  function stallReport(sessions, todayStr, keyLifts, state) {
    var today = safeToday(todayStr);
    var out = { stalled: [], untested: [], testable: false };

    out.testable = trainingWeeks(sessions, today) >= ST1_WEEKS;
    if (!out.testable) return out;
    if (!Array.isArray(keyLifts)) return out;

    var rFrom = dateAdd(today, -ST1_RECENT);
    var pFrom = dateAdd(today, -ST1_PRIOR_FROM);
    var pTo = dateAdd(today, -ST1_PRIOR_TO);
    if (rFrom === null || pFrom === null || pTo === null) return out;
    var wins = deloadWindows(state);                   /* Rule E2 */

    for (var i = 0; i < keyLifts.length; i++) {
      var l = keyLifts[i];
      if (!isObj(l)) continue;
      var id = str(l.id).trim();
      if (id === "") continue;
      var name = (typeof l.n === "string" && l.n.trim() !== "") ? l.n : id;

      var R = dropDeloadRows(e1rmByDate(sessions, id, rFrom, today), wins);
      var P = dropDeloadRows(e1rmByDate(sessions, id, pFrom, pTo), wins);
      if (R.length < ST1_DATES || P.length < ST1_DATES) { out.untested.push(name); continue; }

      var rb = bestE(R), pb = bestE(P);
      /* Unreachable - a scoring set requires w > 0 - but a ratio against a
         zero baseline would be an accusation built on a division by zero. */
      if (rb === null || pb === null || !(pb > 0)) { out.untested.push(name); continue; }

      /* Float note: the audit's boundary case, prior 100x5 against recent
         102.5x5, lands 1.4e-14 ABOVE the threshold, so it passes as the audit
         says it must. The residue runs toward "progress", which is the silent
         direction; a stall verdict is never produced by rounding. */
      if (rb >= pb * ST1_RATIO) continue;                /* progress - say nothing */
      out.stalled.push(name);
    }
    return out;
  }

  /* stallAdvice(ctx) -> { state, provenance, week, stalled, untested, lines,
                           text, absent, absentLines, absentLine, report }

     ctx = { plan, sessions, todayStr, state, keyLifts, report }

     WHY THIS IS A SECOND FUNCTION AND NOT FOUR MORE KEYS ON stallReport.
     Rule C7b splits ST1 in two: a MEASUREMENT that travels to any plan, and a
     DIAGNOSIS that does not. stallReport is the measurement and its shape is
     fixed and tested. This is the diagnosis, and keeping it separate is the
     rule expressed in the code - you can call the arithmetic without ever
     reaching the sentence, and the sentence cannot be assembled anywhere else.

     `plan` is OPTIONAL and defaults to the shipped PHAT plan. `keyLifts` and
     `report` are optional overrides for a caller that already has them;
     omitted, both are derived from the plan.

     THE FOUR STATES, checked in this order:
       "absent"  the plan names no key lifts. Nothing renders on any screen
                 except the plan screen's one line. NEVER "log more sessions" -
                 he may have a year of data and more will not help.
       "early"   trainingWeeks < 6. Nothing renders. No placeholder, no "on
                 track" reassurance (audit 4).
       "thin"    tested lifts exist but some or all are below the block
                 minimum. Existing not-enough-data copy, unchanged.
       "stalled" at least one tested lift failed the 2.5% bar. `provenance`
                 selects the brief's diagnosis or the generic one.
       "quiet"   everything tested is progressing. Nothing renders. The chart
                 is the feedback.

     `week` is trainingWeeks (TW1, addendum 6c), the same number the rest of
     the app counts with - never weeksIn().

     Pure: reads sessions and the plan, writes neither, touches no storage. */
  function stallAdvice(ctx) {
    var c = isObj(ctx) ? ctx : {};
    var plan = isPlanDoc(c.plan) ? c.plan : PHAT_PLAN;
    var sessions = Array.isArray(c.sessions) ? c.sessions : [];
    var today = safeToday(c.todayStr);
    var lifts = Array.isArray(c.keyLifts) ? c.keyLifts : planKeyLifts(plan);
    var tw = trainingWeeks(sessions, today);

    var out = notAbsent({
      state: "quiet", provenance: null, week: tw,
      stalled: [], untested: [], lines: [], text: "",
      report: { stalled: [], untested: [], testable: false }
    });

    /* ABSENT FIRST. A plan that declares nothing never reaches a
       "not enough data yet" message, because more data will never help. */
    if (!lifts.length) {
      out.state = "absent";
      markAbsent(out, ST1_ABSENT);
      out.lines = out.absentLines.slice(0);
      out.text = out.absentLine;
      return out;
    }

    var rep = (isObj(c.report) && Array.isArray(c.report.stalled) && Array.isArray(c.report.untested))
      ? c.report
      : stallReport(sessions, today, lifts, isObj(c.state) ? c.state : null);
    out.report = rep;
    out.stalled = rep.stalled.slice(0);
    out.untested = rep.untested.slice(0);

    if (!rep.testable) { out.state = "early"; return out; }

    if (rep.stalled.length) {
      out.state = "stalled";
      out.provenance = phatProvenance(plan) ? "phat" : "generic";
      /* Comma-joined, in key-lift order, matching audit 4's own copy and the
         order he reads on the chart legend. Not andList - that is D1's
         vocabulary for D1's banner. */
      out.lines = ["Week " + tw + " and no progress on " + rep.stalled.join(", ") + "."]
        .concat(out.provenance === "phat" ? ST1_PHAT_LINES : ST1_GENERIC_LINES);
      out.text = out.lines.join(" ");
      return out;
    }

    if (rep.untested.length) {
      out.state = "thin";
      /* All of them, and there are exactly four: the audit's own sentence.
         Any other count and that sentence would be false, so it falls to the
         per-lift line, which is true at any count. */
      if (rep.untested.length === lifts.length && lifts.length === PLAN_KEYLIFT_MAX) {
        out.lines = [ST1_THIN_ALL];
      } else {
        out.lines = rep.untested.map(function (n) {
          return "Not enough sessions on " + n + " to judge. Log it weekly.";
        });
      }
      out.text = out.lines.join(" ");
      return out;
    }

    return out;   /* "quiet" - everything tested is progressing. Say nothing. */
  }

  /* --------------------------------------------------- shared plumbing
     Used by SP1, V1 and D1 below. Nothing here is exported. */

  /* Own-property test. `reintro["constructor"]` is a function on every object
     literal, and a day id is a string that arrives from stored JSON. */
  function own(o, k) {
    return isObj(o) && typeof k === "string" &&
           Object.prototype.hasOwnProperty.call(o, k);
  }

  /* Shallow copy, the setCalChanged shape. Never a deep clone: the state's
     sessions array comes out BY REFERENCE and untouched, which is the point -
     a state setter may not rewrite a logged set even by accident. */
  function copyObj(o) {
    var out = {};
    if (isObj(o)) Object.keys(o).forEach(function (k) { out[k] = o[k]; });
    return out;
  }

  /* A stored value that is a usable local date, or null. */
  function dateOrNull(v) {
    return (typeof v === "string" && DATE_RE.test(v.trim())) ? v.trim() : null;
  }

  /* ------------------------------------------- the ABSENT shape (Rule C7a)

     Every plan-keyed rule - SP1, V1, ST1, D1, cycleLine - answers in three
     states, not two: ABSENT (the plan declares nothing), PRESENT-THIN (it
     declares it, the log is too thin) and PRESENT. ABSENT is checked FIRST and
     never shares copy with thin, because "log more" is a lie when the feature
     is switched off by the plan and he would log for six weeks waiting for a
     message that cannot arrive.

     Three fields, on every one of them, so a view and a test read one shape:
       absent       Boolean
       absentLines  the coach's copy, one element per rendered line, verbatim
       absentLine   the same copy joined for a caller with a single slot

     `reason` is NOT part of this shape. deloadCheck's `reason` is a developer
     signal that must never be rendered, and overloading it would put a
     developer token one careless template away from the screen. */
  function markAbsent(out, lines) {
    out.absent = true;
    out.absentLines = lines.slice(0);
    out.absentLine = lines.join(" ");
    return out;
  }
  function notAbsent(out) {
    out.absent = false;
    out.absentLines = [];
    out.absentLine = "";
    return out;
  }

  /* "Row and DB press" / "Row, Bench and Squat". Comma-joined with a final
     `and`, matching ST1's warning style (audit section 4). */
  function andList(names) {
    var a = [];
    for (var i = 0; i < names.length; i++) {
      var s = str(names[i]).trim();
      if (s !== "") a.push(s);
    }
    if (!a.length) return "";
    if (a.length === 1) return a[0];
    return a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  }

  /* ==================================================== Rule SP1 - W12
     Speed-work load. audit section 7, with addendum S2a.

     WHAT THIS REPLACES. The speed card prints `65-70% of your power-day top
     set. Rest 60-90 seconds.` and leaves him doing arithmetic between sets
     with chalky hands. "Top set" is also not a 3-5RM: his top set could be a
     3-rep grinder or an easy 5.

     R is the heaviest COMPLETED set on the mapped power lift with reps in
     [3,5], inside the window. A 90x8 is excluded even though it implies a
     3-5RM near 105: inferring that and printing 71 kg dresses an estimate up
     as a measurement (audit section 7, worked example 3).

     NEVER CACHED. Recomputed from history every session, which is also why
     Rule S2 leaves it alone (addendum S2a): P1 holds the source lift's load
     while a pain flag is live and R is a historical maximum, so this number
     cannot climb during a flagged period. Shaving a load off a keyword match
     would be re-prescribing, which audit section 10 forbids. The target, the
     band and speedTooHeavy all print unchanged under a pain flag.

     PURITY AND DATA. Nothing here mutates `sessions`, writes storage, or
     touches a logged value. speedTooHeavy is ADVICE: a true return may never
     block a save, alter a stored set or change what is on screen in the
     weight field. */

  /* COMPILED FROM THE SHIPPED PLAN (W3), not typed out here. Exported
     unchanged and identical in value to the constant it replaces, so
     everything that read PHAT.SPEED_SRC still reads the same three pairs -
     they are now the shipped plan's declaration rather than this file's
     assertion that every plan is PHAT. */
  var SPEED_SRC = deepFreeze(planSpeedSource(PHAT_PLAN));
  var SP1_MID = 0.675;       /* the printed target                        */
  var SP1_BAND_LO = 0.65;
  var SP1_BAND_HI = 0.70;
  var SP1_CAP = 0.75;        /* above this it is not speed work           */
  var SP1_REP_LO = 3, SP1_REP_HI = 5;
  var SP1_WINDOW = 28;       /* [today-28 .. today]                       */
  var SP1_WIDE = 56;
  var SP1_INSTRUCTION = "If a rep slows down, the set is over. Cut the weight, not the sets.";

  /* Rule C7a's ABSENT copy for SP1 (addendum 8.4), verbatim. The second line
     is character-identical to the thin-data fallback above on purpose: the
     ADVICE is the same, only the reason differs. `Log a heavy triple on X` is
     a lie when the plan names no X to log it on, and that is the whole
     distinction between ABSENT and not-enough-data. */
  var SP1_ABSENT = [
    "No source lift set for this speed work. Set one in the plan to get a number.",
    "Until then: 65–70% of a weight you could triple."
  ];

  /* The heaviest qualifying set on `srcId` inside [today-days .. today], or
     null. Heaviest wins on weight; the LATER date wins a tie, so the source
     quoted on the card is the most recent time he lifted it.

     w > 0 is required. R = 0 would make every load above 0 "too heavy" - the
     coach's ruling on SP1: the rule requires R > 0 or speedTooHeavy(w, 0)
     flags every set ever logged. A 0 kg source set is also not a 3-5RM. */
  function sp1Source(sessions, srcId, todayStr, days) {
    if (!Array.isArray(sessions)) return null;
    var today = safeToday(todayStr);
    var from = dateAdd(today, -days);
    if (from === null) return null;
    var best = null, i, j, s, d, e, n;
    for (i = 0; i < sessions.length; i++) {
      s = sessions[i];
      d = sessionDate(s);
      if (d === "" || d < from || d > today) continue;
      if (!isObj(s) || !isObj(s.entries) || !own(s.entries, srcId)) continue;
      e = s.entries[srcId];
      if (!isObj(e) || !Array.isArray(e.sets)) continue;
      for (j = 0; j < e.sets.length; j++) {
        n = numSet(e.sets[j]);
        if (!n) continue;
        if (n.r < SP1_REP_LO || n.r > SP1_REP_HI) continue;
        if (!(n.w > 0)) continue;
        if (best === null || n.w > best.w || (n.w === best.w && d > best.date)) {
          best = { w: n.w, r: n.r, date: d };
        }
      }
    }
    return best;
  }

  /* speedLoad(sessions, exId, todayStr, srcName, plan)
       -> { exId, srcId, target, lo, hi, source:{w,r,date}|null, srcWindow,
            reason, text, instruction, absent, absentLines, absentLine }

     `plan` is OPTIONAL and defaults to the shipped PHAT plan, which is exactly
     the behaviour of the constant it replaced - every existing caller and
     fixture is unchanged. Every caller on a plan the user can edit MUST pass
     the active plan, or it will be told PHAT's answer about a plan that is not
     PHAT.

     `target` is null whenever there is no number to print, and `reason` says
     why: "unknown" (not a speed slot at all), "no-source" (a source lift is
     declared, nothing qualifying inside 56 days - PRESENT-THIN), or
     "no-source-lift" (the plan calls this speed work and names no lift to
     compute from - ABSENT, Rule C7a).
     `srcName` is the source exercise's CURRENT name from PROGRAM - the
     fallback copy interpolates it (WO-003 Decision 5), so B-28's rename
     reaches this string without touching this file. Omit it and the fallback
     names the id, which is visibly wrong rather than quietly stale.

     `srcWindow` is 28 or 56 - which window produced R - or null. The card does
     not have to say, but a test does, and so does anyone reading a number
     that came from seven weeks ago.

     Never throws, never mutates, never caches. */
  function speedLoad(sessions, exId, todayStr, srcName, plan) {
    var id = str(exId).trim();
    var p = isPlanDoc(plan) ? plan : PHAT_PLAN;
    var map = (p === PHAT_PLAN) ? SPEED_SRC : planSpeedSource(p);
    var out = notAbsent({
      exId: id, srcId: null, target: null, lo: null, hi: null,
      source: null, srcWindow: null, reason: null, text: "",
      instruction: SP1_INSTRUCTION
    });
    if (!own(map, id)) {
      /* ABSENT vs unknown. The plan calling this slot speed work is what makes
         a missing source a thing to SAY; anything else is not a speed slot and
         there is nothing to say about it at all. `instruction` still ships in
         both cases - "if a rep slows down the set is over" needs no number. */
      var ex = exById(p, id);
      if (isObj(ex) && ex.k === "speed") {
        out.reason = "no-source-lift";
        markAbsent(out, SP1_ABSENT);
        out.text = out.absentLine;
        return out;
      }
      out.reason = "unknown";
      return out;
    }
    out.srcId = map[id];
    var name = (typeof srcName === "string" && srcName.trim() !== "")
      ? srcName.trim() : out.srcId;

    var src = sp1Source(sessions, out.srcId, todayStr, SP1_WINDOW);
    var win = SP1_WINDOW;
    if (src === null) { src = sp1Source(sessions, out.srcId, todayStr, SP1_WIDE); win = SP1_WIDE; }
    if (src === null) {
      out.reason = "no-source";
      out.text = "Log a heavy triple on " + name +
                 " and this becomes a number. Until then: 65–70% of a weight you could triple.";
      return out;
    }

    out.source = { w: src.w, r: src.r, date: src.date };
    out.srcWindow = win;
    out.target = round2p5(src.w * SP1_MID);
    out.lo = round2p5(src.w * SP1_BAND_LO);
    out.hi = round2p5(src.w * SP1_BAND_HI);
    out.text = kg(out.target) + " kg. 65–70% of your " + kg(src.w) +
               " kg triple. Rest 60–90 s. Fast, never grinding.";
    return out;
  }

  /* speedTooHeavy(w, R) -> Boolean. R is the source max, NOT the target.
     False on anything unreadable and false when R is not above zero: the
     coach's ruling, because `w > 0 * 0.75` is true for every set ever logged
     and a flag that fires always is a flag he learns to ignore.

     ADVICE ONLY. The caller renders a line; it does not touch the field, the
     draft or the saved session (W13's data-loss criterion). */
  function speedTooHeavy(w, R) {
    var pw = parseWeight(w);
    if (!pw.ok) return false;
    if (typeof R !== "number" || !isFinite(R) || !(R > 0)) return false;
    return pw.value > R * SP1_CAP;
  }

  /* The flag's copy: `110 kg is not speed work. Drop to 95 kg.`
     "" when there is no target to drop to - the app never says `Drop to 0 kg`
     (Rule Z2), and it never flags a load it cannot name an alternative to. */
  function speedFlagText(w, target) {
    var pw = parseWeight(w);
    if (!pw.ok) return "";
    if (typeof target !== "number" || !isFinite(target) || !(target > 0)) return "";
    return kg(pw.value) + " kg is not speed work. Drop to " + kg(target) + " kg.";
  }

  /* =============================================== Rule S2 - painWindow
     Landed here, ahead of W16, because Rule V1's offer gate cannot be built
     without it (addendum S2b). W16 owns the rest of S1/S2: the per-exercise
     notice, the commit-time flag and ST1's appended line. It should CALL this,
     not write a second copy of the window.

     painWindow(sessions, todayStr, days, program)
       -> {active, exIds, names, lastDate}

     Scans every entry note in sessions dated [today-(days-1) .. today] for a
     painFlag match. `days` defaults to 7. `program` is optional and is only
     used to turn ids into names; without it `names` mirrors `exIds`.

     Minimum data: none. No sessions in the window -> active false. Absence is
     never read as a signal, the same principle as D1's "absence is not
     fatigue" - a man who writes no notes is not a man in pain. */
  var PAIN_DAYS = 7;
  function painWindow(sessions, todayStr, days, program) {
    var out = { active: false, exIds: [], names: [], lastDate: null };
    if (!Array.isArray(sessions)) return out;
    var n = (typeof days === "number" && isFinite(days) && days >= 1) ? Math.floor(days) : PAIN_DAYS;
    var today = safeToday(todayStr);
    var from = dateAdd(today, -(n - 1));
    if (from === null) return out;
    var seen = {}, i, k, s, d, ids, e;
    for (i = 0; i < sessions.length; i++) {
      s = sessions[i];
      d = sessionDate(s);
      if (d === "" || d < from || d > today) continue;
      if (!isObj(s.entries)) continue;
      ids = Object.keys(s.entries);
      for (k = 0; k < ids.length; k++) {
        e = s.entries[ids[k]];
        if (!isObj(e) || !painFlag(e.note)) continue;
        out.active = true;
        if (!own(seen, ids[k])) { seen[ids[k]] = true; out.exIds.push(ids[k]); }
        if (out.lastDate === null || d > out.lastDate) out.lastDate = d;
      }
    }
    out.exIds.sort();
    out.names = out.exIds.map(function (id) { return exName(program, id); });
    return out;
  }

  /* ================================================ Rule S1 - painState

     WO-004 W4, and WO-003's W16 finally built. audit section 10, UX spec 4.8.

     painState(sessions, exId) -> { active, exId, date, note, lines, text,
                                    provenanceLine, checked }

     Does the MOST RECENT logged entry for this exercise carry a pain note?
     That is the whole rule, and it is deliberately ordinal rather than dated:
     the notice persists across sessions until a later session logs that
     exercise with no matching note. A month off does not clear it and a
     session on a different exercise does not clear it - only doing THAT
     exercise again, without writing it again, does.

     NO SECOND WINDOW. painWindow (Rule S2, above) is the 7-day sweep across
     every exercise that gates V1's offer; this is one exercise's latest entry.
     They share the one regex, painFlag, and nothing else - there is exactly one
     definition of what the word "pain" is in this file, and this does not add a
     second date window for the app to disagree with itself across.

     WHAT COUNTS AS "LOGGED". An entry with at least one completed set, or a
     note. An exercise that appeared on the card and was left empty is not a
     session on that exercise and neither shows nor clears anything.

     THE COPY IS FIXED (audit section 10). No interpolation, no severity word,
     no substitute exercise, no stretch, no rep-range advice, no dismissal. The
     rule IS the refusal: stop recommending more load, and point at a person.
     A keyword match will occasionally fire on `no pain today` - that false
     positive costs one held session and two lines of text, and it is the right
     side to be wrong on.

     Pure: reads sessions, mutates nothing, touches no storage, reads no clock.
     `todayStr` is not a parameter because no date bounds this rule. */
  var S1_LINES = [
    "You logged pain on this. Not something this app can assess.",
    "Holding the weight. If it is sharp, or it repeats, stop the exercise and see a physio or a doctor."
  ];
  /* UX spec 4.8, marked NEW and PENDING COACH REVIEW there. Returned as its own
     field, never joined into `text`, so the view can render the two approved
     lines today and add this one only once the coach has signed it off. */
  var S1_PROVENANCE = "From your last session on this.";

  function painState(sessions, exId) {
    var id = str(exId).trim();
    var out = { active: false, exId: id, date: null, note: "", lines: [], text: "",
                provenanceLine: "", checked: false };
    if (!Array.isArray(sessions) || id === "") return out;

    var best = null, bestDate = "", i, j, s, d, e, hasSet, note;
    for (i = 0; i < sessions.length; i++) {
      s = sessions[i];
      if (!isObj(s) || !isObj(s.entries) || !own(s.entries, id)) continue;
      e = s.entries[id];
      if (!isObj(e)) continue;
      note = (typeof e.note === "string") ? e.note : "";
      hasSet = false;
      if (Array.isArray(e.sets)) {
        for (j = 0; j < e.sets.length; j++) if (isDoneSet(e.sets[j])) { hasSet = true; break; }
      }
      if (!hasSet && note.trim() === "") continue;
      d = sessionDate(s);
      /* Latest date wins; on the same date the later position in the array
         wins, which is the order they were saved in. A session with no usable
         date still counts - it is a logged entry - and sorts before any dated
         one rather than being dropped. */
      if (best === null || d >= bestDate) { best = { note: note, date: d }; bestDate = d; }
    }
    if (best === null) return out;

    out.checked = true;
    out.date = best.date === "" ? null : best.date;
    out.note = best.note;
    if (!painFlag(best.note)) return out;

    out.active = true;
    out.lines = S1_LINES.slice(0);
    out.text = S1_LINES.join(" ");
    out.provenanceLine = S1_PROVENANCE;
    return out;
  }

  /* ===================================================== Rule R1 - W4
     Rest targets and the rest band's copy. audit section 6, confirmed per
     EXERCISE by addendum 8.5.

     THE INPUT IS THE EXERCISE. `ex.k` and `ex.hi`. Nothing else - no day
     field, no plan field, no history, no clock. `rest` is NOT a field on a day
     and must never become one: the design's per-day number is wrong on 24 of
     the 42 slots, and on the three speed slots it calls him ready at 90 s,
     which is the exact number past which R1 says the set is ruined. A stored
     per-day rest is a second source of truth for a rule that already has one.

     restTarget(ex) -> {ready, cap, hard} | null
       power, hi <= 8   -> 150 / 180
       power, hi >  8   -> 120 / 180
       hyp,   hi <= 12  ->  90 / 120
       hyp,   hi > 12   ->  60 / 120
       speed            ->  60 /  90, hard:true

     `hard` is true only for speed work, where the cap is a HARD cap: the short
     rest IS the stimulus, and past it he has not rested too long, he has done a
     different exercise.

     `hi` MISSING OR NON-NUMERIC -> the conservative row within that `k`, and
     conservative FLIPS SIGN by role (addendum 8.5): power 150 and hyp 90 are
     the LONGER rests, because under-resting heavy and moderate work is the
     harmful direction; speed stays 60/90, the SHORTER, because for speed work
     resting too long is the harmful direction. This is the one place in the
     app where "play it safe" means two opposite things, so it is written out
     rather than derived.

     `k` UNRECOGNISED -> null. There is no fourth role to be conservative
     within, and a guessed rest interval is a number he would stand still for.
     restText renders its idle state instead: fail silent, never fail confident.

     A USER-CREATED EXERCISE needs nothing a user plan lacks. `k` is required
     at creation (C-7) and the editor collects lo/hi, so R1 runs unchanged on a
     plan that did not exist when this was written. Cable crunch {k:"hyp",
     lo:12, hi:15} -> 60 / 120, with no special case anywhere.

     Pure, and it never mutates `ex`. */
  var R1 = {
    powerLong:  { ready: 150, cap: 180, hard: false },   /* hi <= 8  */
    powerShort: { ready: 120, cap: 180, hard: false },   /* hi >  8  */
    hypLong:    { ready:  90, cap: 120, hard: false },   /* hi <= 12 */
    hypShort:   { ready:  60, cap: 120, hard: false },   /* hi >  12 */
    speed:      { ready:  60, cap:  90, hard: true }
  };
  var R1_POWER_HI = 8, R1_HYP_HI = 12;

  function restTarget(ex) {
    if (!isObj(ex)) return null;
    var k = str(ex.k).trim();
    var hi = (typeof ex.hi === "number" && isFinite(ex.hi)) ? ex.hi : null;
    var row;
    if (k === "speed") row = R1.speed;
    else if (k === "power") row = (hi === null || hi <= R1_POWER_HI) ? R1.powerLong : R1.powerShort;
    else if (k === "hyp") row = (hi === null || hi <= R1_HYP_HI) ? R1.hypLong : R1.hypShort;
    else return null;
    return { ready: row.ready, cap: row.cap, hard: row.hard };
  }

  /* m:ss. No leading zero on the minutes, always two digits of seconds -
     `1:12`, `2:30`, `0:45`. Never Intl, never a Date. */
  function mmss(sec) {
    var n = Math.floor(sec);
    if (!isFinite(n) || n < 0) n = 0;
    return Math.floor(n / 60) + ":" + pad2(n % 60);
  }

  /* restText(ex, elapsedSeconds)
       -> { text, state, stopped, ready, cap, hard, elapsed }

     ELAPSED SECONDS IS AN ARGUMENT, and that is the whole design of the timer.
     The caller owns one absolute start timestamp and recomputes elapsed from
     the wall clock on every tick and on visibilitychange; a tick count does not
     survive backgrounding a phone and three minutes in a pocket must come back
     as three minutes. Nothing here reads a clock, so nothing here can be wrong
     about what time it is.

     `state` 0..5, matching UX spec 4.10's table:
       0  idle / unreadable / negative        `Rest timer starts when you log a set.`
       1  0 <= t < ready                      `Rest 1:12 · go at 2:30`
       2  ready <= t <= cap                   `Ready.`
       3  t > cap, power or hyp               `3:20. You are past the rest window. Go.`
       4  t > cap, speed                      `2:10. Too long for speed work. Go now or drop the weight.`
       5  t >= 2 x cap                        `Rest over.`  and `stopped` is true

     `stopped` tells the caller it may stop ticking. It is the only state that
     ends: a timer that counts to eleven minutes is a number he reads instead of
     lifting.

     The timer is a comfort feature and it is never in the save path. It renders
     state 0 rather than `NaN:aN` for every bad input there is, and it must
     never be the reason a set is late. */
  var R1_IDLE = "Rest timer starts when you log a set.";

  function restText(ex, elapsedSeconds) {
    var t = restTarget(ex);
    var out = { text: R1_IDLE, state: 0, stopped: false,
                ready: t ? t.ready : null, cap: t ? t.cap : null,
                hard: t ? t.hard : null, elapsed: null };
    if (!t) return out;
    if (typeof elapsedSeconds !== "number" || !isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      return out;
    }
    var e = Math.floor(elapsedSeconds);
    out.elapsed = e;

    if (e >= t.cap * 2) {
      out.state = 5; out.stopped = true; out.text = "Rest over.";
      return out;
    }
    if (e > t.cap) {
      out.state = t.hard ? 4 : 3;
      out.text = mmss(e) + (t.hard
        ? ". Too long for speed work. Go now or drop the weight."
        : ". You are past the rest window. Go.");
      return out;
    }
    if (e >= t.ready) {
      out.state = 2; out.text = "Ready.";
      return out;
    }
    out.state = 1;
    out.text = "Rest " + mmss(e) + " · go at " + mmss(t.ready);
    return out;
  }

  /* ===================================================== Rule V1 - W14
     The volume tier and accessory reintroduction. audit section 5, with
     addendum S2b (pain suppresses the OFFER and nothing else) and 6a/6c
     (weeks are counted in distinct training DAYS).

     WHAT THIS REPLACES. One global boolean, S.includeCut, that adds all nine
     cut exercises back in a single tap, under copy that says "leave this off
     for the first four weeks" and then never mentions it again. Two failure
     modes and he is one tap from either: tick it in week 2 and bury himself -
     the exact outcome the brief's warning exists to prevent - or never tick it
     and train reduced volume forever.

     THE GATE IS trainingWeeks, NEVER THE CALENDAR. Five calendar weeks with
     two sessions in two of them is week 3 of real training, and the tier line
     says so out loud. Gating this on elapsed time is how a checkbox becomes
     nine accessories in week 2 by another route.

     WHAT THIS FUNCTION MAY AND MAY NOT DO. It changes what he is ASKED to do.
     It may never change what he has already logged: an exercise the tier hides
     that carries anything in the current draft comes back in `exerciseIds`
     and is named in `kept`, so the card renders and the sets save. Nothing
     here reads or writes storage, and the stored `includeCut` key is never
     touched or read (WO-003 Decision 6). */

  /* Per-day reintroduction order (audit section 5). The coach's ordering, and
     it IS programme data - it names this programme's slots - so W3 moved the
     declaration onto the shipped plan and this is the compiled copy. Identical
     in value to the constant it replaces. Note d4 and d5 are NOT in slot
     order; that is the coach's ordering and it ships as written. */
  var REINTRO_ORDER = deepFreeze(planReintroOrder(PHAT_PLAN));
  /* The first training week an offer can be made, ON PHAT. Exported as
     PHAT.V1.week for a caller that wants the shipped number; the ENGINE reads
     planReducedWeeks(plan) + 1, so a plan with its own block is honoured and
     PHAT still lands on 5. Do not reintroduce this constant into the logic. */
  var V1_WEEK = PLAN_REDUCED_DEFAULT + 1;

  /* Rule C7a's ABSENT copy for V1 (addendum 8.4), verbatim. Plan screen only -
     never on Train, never on the session card. There is no version of this
     that belongs next to a set he is about to lift. */
  var V1_ABSENT = [
    "This plan has no reduced-volume tier. Every exercise runs from week 1.",
    "Mark accessories as cut in the plan to phase them in."
  ];

  /* How many sessions he has actually logged - a session with at least one
     completed set, the same test every other rule in this file uses for "did
     he train". It is the count in the ABSENT cycle line (`Week 7 · 31
     sessions`), which is the only number that line can honestly carry once the
     accessory count is gone. */
  function loggedSessions(sessions) {
    if (!Array.isArray(sessions)) return 0;
    var n = 0;
    for (var i = 0; i < sessions.length; i++) if (sessionHasCompletedSet(sessions[i])) n++;
    return n;
  }
  var V1_COOLDOWN = 7;       /* days between offers, per day id           */

  function findDay(program, dayId) {
    if (!Array.isArray(program)) return null;
    var id = str(dayId).trim();
    for (var i = 0; i < program.length; i++) {
      if (isObj(program[i]) && str(program[i].id).trim() === id) return program[i];
    }
    return null;
  }

  /* An exercise's display name from the caller's PROGRAM, or the id. The id is
     a visibly wrong name rather than a blank or a stale one. */
  function exName(program, exId) {
    var id = str(exId).trim();
    if (id === "") return "";
    var list = Array.isArray(program) ? program : [];
    for (var i = 0; i < list.length; i++) {
      var d = list[i];
      if (!isObj(d)) continue;
      var ex = Array.isArray(d.ex) ? d.ex : (Array.isArray(d) ? d : null);
      if (!ex) continue;
      for (var j = 0; j < ex.length; j++) {
        if (isObj(ex[j]) && str(ex[j].id).trim() === id) {
          return (typeof ex[j].n === "string" && ex[j].n.trim() !== "") ? ex[j].n : id;
        }
      }
    }
    return id;
  }

  function exNameIn(exList, exId) {
    var id = str(exId).trim();
    if (!Array.isArray(exList)) return id;
    for (var i = 0; i < exList.length; i++) {
      if (isObj(exList[i]) && str(exList[i].id).trim() === id) {
        return (typeof exList[i].n === "string" && exList[i].n.trim() !== "") ? exList[i].n : id;
      }
    }
    return id;
  }

  function cutIdsOf(exList) {
    var out = [];
    if (!Array.isArray(exList)) return out;
    for (var i = 0; i < exList.length; i++) {
      var e = exList[i];
      if (isObj(e) && e.cut && str(e.id).trim() !== "") out.push(str(e.id).trim());
    }
    return out;
  }

  /* The order the PLAN declares for a day, raw and unreconciled. Falls back to
     the shipped plan's declaration, which is what this file asserted before
     W3 moved the table onto the document. */
  function declaredOrder(plan, dayId) {
    var p = isPlanDoc(plan) ? plan : PHAT_PLAN;
    var id = str(dayId).trim();
    var m = isObj(p.reintroOrder) ? p.reintroOrder : null;
    return (own(m, id) && Array.isArray(m[id])) ? m[id] : [];
  }

  /* The day's reintroduction order, reconciled with the day it is applied to.
     Ids the plan lists that this day does not mark cut:1 are dropped - which
     is how a deleted or un-cut accessory stops being offered without leaving a
     dangling id (W3). cut:1 ids the plan did not list are APPENDED in slot
     order, because the failure mode of the alternative is an accessory that
     can never be reintroduced, or a counter that points past the end of the
     list, and neither is worth a throw. */
  function orderFor(dayId, exList, declared) {
    var cuts = cutIdsOf(exList);
    var listed = Array.isArray(declared) ? declared : [];
    var out = [], i;
    for (i = 0; i < listed.length; i++) {
      if (cuts.indexOf(listed[i]) >= 0 && out.indexOf(listed[i]) < 0) out.push(listed[i]);
    }
    for (i = 0; i < cuts.length; i++) {
      if (out.indexOf(cuts[i]) < 0) out.push(cuts[i]);
    }
    return out;
  }

  function counterOf(state, dayId) {
    var r = (isObj(state) && isObj(state.reintro)) ? state.reintro : null;
    var v = own(r, str(dayId).trim()) ? r[str(dayId).trim()] : 0;
    return (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  }

  function stampOf(state, dayId) {
    var m = (isObj(state) && isObj(state.lastReintroDate)) ? state.lastReintroDate : null;
    return own(m, str(dayId).trim()) ? dateOrNull(m[str(dayId).trim()]) : null;
  }

  /* {back, cuts} across the WHOLE programme, for the status and cycle lines.
     Each day's counter is clamped to that day's cut count on the way out, so
     a counter that somehow ran past its list can never print "10 of 9". */
  function accessoryTotals(program, state) {
    var out = { back: 0, cuts: 0 };
    if (!Array.isArray(program)) return out;
    for (var i = 0; i < program.length; i++) {
      var d = program[i];
      if (!isObj(d)) continue;
      var c = cutIdsOf(d.ex).length;
      out.cuts += c;
      out.back += Math.min(counterOf(state, d.id), c);
    }
    return out;
  }

  /* calendarWeeks(sessions, todayStr) -> integer.
     Monday-start weeks from the first TRAINING day's week to todayStr's week,
     inclusive. This is {cw} in the UX spec: the number he gets by counting on
     a calendar, and the one that diverges from trainingWeeks. Both are shown
     together or neither is - a week number he cannot reproduce is a number he
     stops trusting (UX spec 1.3). */
  function calendarWeeks(sessions, todayStr) {
    var days = trainingDays(sessions, todayStr);
    if (!days.length) return 0;
    var a = weekStart(days[0]), b = weekStart(safeToday(todayStr));
    if (a === null || b === null) return 0;
    var g = dayGap(a, b);
    if (g === null || g < 0) return 0;
    return Math.floor(g / 7) + 1;
  }

  /* Does the draft hold anything at all for this exercise? A non-blank weight,
     a non-blank rep count, or a note. All three are his, and the tier hides
     none of them (UX spec 0.1 rule 2, WO-003 W14's data-loss criterion). */
  function draftHas(draft, exId) {
    if (!isObj(draft)) return false;
    var entries = isObj(draft.entries) ? draft.entries : draft;
    if (!own(entries, exId)) return false;
    var e = entries[exId];
    if (!isObj(e)) return false;
    if (typeof e.note === "string" && e.note.trim() !== "") return true;
    if (!Array.isArray(e.sets)) return false;
    for (var i = 0; i < e.sets.length; i++) {
      var s = e.sets[i];
      if (!isObj(s)) continue;
      if (str(s.w).trim() !== "" || str(s.r).trim() !== "") return true;
    }
    return false;
  }

  /* Small-number English, so the weeks-1-4 sentence can carry a plan's own
     number without a second copy of the sentence. Not training vocabulary -
     just the word for a digit. */
  var NUM_WORDS = ["zero", "one", "two", "three", "four", "five",
                   "six", "seven", "eight", "nine", "ten"];
  function numWord(n) {
    return (typeof n === "number" && isFinite(n) && n >= 0 && n < NUM_WORDS.length &&
            Math.floor(n) === n) ? NUM_WORDS[n] : String(n);
  }

  /* The programme-state lines, in one place, because two functions print them
     and the copy may not drift between them (audit section 5, section 8, UX
     spec 1.2/1.3). Returns every candidate; the callers choose by precedence.
       row         the "where am I" line for this week
       status      the accessory count line, after the reduced-volume block
       divergence  calendar week vs training week, when they differ
       explain     the one sentence that answers the divergence

     `rw`    the plan's reduced-volume block in training weeks (4 on PHAT)
     `tier`  does the plan HAVE a reduced-volume tier at all (Rule C7a)
     `nSess` logged sessions, for the ABSENT row that cannot count accessories */
  function tierLines(tw, cw, back, cuts, hasSessions, dl, rw, tier, nSess) {
    var out = { row: "", status: "", divergence: "", explain: "" };
    rw = (typeof rw === "number" && isFinite(rw) && rw >= 0) ? Math.floor(rw) : PLAN_REDUCED_DEFAULT;
    tier = (tier !== false);
    nSess = (typeof nSess === "number" && isFinite(nSess) && nSess >= 0) ? Math.floor(nSess) : 0;
    if (isObj(dl) && dl.active) {
      out.row = dl.text;
      return out;
    }
    if (!hasSessions) return out;

    if (cw !== tw && tw > 0) {
      /* The suffix is a claim about a volume tier. On a plan that has none it
         is dropped; the week arithmetic is plan-agnostic and stays. */
      out.divergence = "Week " + cw + " by the calendar, week " + tw + " of real training." +
                       ((tier && tw <= rw) ? " Reduced volume holds." : "");
      out.explain = "A training week is a week with three or more logged sessions.";
    }

    /* ABSENT (Rule C7a): no reduced-volume tier, so no weeks-1-4 block, no
       phase name and no accessory count. `0 of 0 accessories back` is the
       shape of sentence that makes an app look broken, and `full volume phase`
       names a programme structure this plan does not have. What is left is the
       part that is true on any plan: which week it is, and how much he has
       logged. */
    if (!tier) {
      out.row = "Week " + tw + " · " + nSess + (nSess === 1 ? " session" : " sessions");
      return out;
    }

    if (back >= cuts && cuts > 0 && tw > rw) {
      out.status = "Full volume. All " + cuts + " accessories are in.";
    } else if (tw > rw) {
      out.status = "Week " + tw + " · " + back + " of " + cuts + " accessories back in.";
    }

    if (tw === 0) {
      out.row = "Reduced volume until you have logged " + numWord(rw) + " " +
                (rw === 1 ? "week" : "weeks") + " of three or more sessions.";
    } else if (tw <= rw) {
      out.row = "Week " + tw + " of " + rw + " at reduced volume. The cut exercises come back from week " +
                (rw + 1) + ".";
    } else if (tw === rw + 1) {
      out.row = out.status;
    } else {
      out.row = "Week " + tw + " · full volume phase · " + back + " of " + cuts +
                " accessories back · last deload: " +
                (isObj(dl) && dl.last ? dayMon(dl.last) : "none");
    }
    return out;
  }

  /* volumeTier(ctx)
       -> { dayId, trainingWeeks, calendarWeeks, exerciseIds, prescribed, kept,
            reintroduced, offer:{exId,name,dayId}|null, offerLine,
            blocked, blockedLine, back, cuts, dayBack, dayCuts,
            statusLine, tierLine, tierNote, deload:{active,day} }

     ctx = { dayId, program, exercises, sessions, state, todayStr, stallReport,
             deload, draft }

     ONE CONTEXT OBJECT, not the positional list in WO-003 W14 - and the
     deviation is deliberate, so read this before "fixing" it. The work order's
     signature cannot satisfy its own acceptance criteria: `exerciseIds`
     needs the day's exercises, `statusLine` needs every day's cut count, the
     offer needs the exercise's NAME, and the data-loss criterion needs the
     current draft. That is four inputs it does not carry, and WO-003
     Decision 3 already ruled that a rule which grows inputs mid-batch takes an
     object, because three signature changes are three chances to drop an
     argument silently.

     `program` is the caller's PROGRAM. This file does not hold a copy of it:
     stallReport takes keyLifts for the same reason. Two copies of his
     programme is two places a rep range can drift, and the one in index.html
     is the one he trains from. `exercises` overrides the day lookup for a
     caller that only has one day.

     `state` is the log store: {reintro, lastReintroDate, ...}. Read only.
     `deload` overrides state.deload for a caller holding it separately.

     `plan` is OPTIONAL (W3) and defaults to the shipped PHAT plan, which is
     exactly what this file assumed before the tables moved onto the document.
     It supplies the per-day reintroduction order and the length of the
     reduced-volume block, and it answers the one question `program` cannot:
     does this plan HAVE a reduced-volume tier at all. Every caller on an
     editable plan must pass it.

     ABSENT (Rule C7a): a plan where no exercise carries `cut` has no tier, no
     weeks-1-4 block, no reintroduction offer and no rollback. Every exercise
     renders from week 1 - which is already what the code below does, because
     there is nothing to hide - and `absent` plus `absentLines` say so once, on
     the plan screen. Never on Train, never on the session card.

     Fails OPEN, never throws (UX spec 1.7): garbage in gives the base
     exercises, no offer and empty lines. A partial day is never returned and a
     populated card is never hidden. */
  function volumeTier(ctx) {
    var c = isObj(ctx) ? ctx : {};
    var today = safeToday(c.todayStr);
    var sessions = Array.isArray(c.sessions) ? c.sessions : [];
    var program = Array.isArray(c.program) ? c.program : null;
    var plan = isPlanDoc(c.plan) ? c.plan : PHAT_PLAN;
    var dayId = str(c.dayId).trim();
    var day = findDay(program, dayId);
    var exList = Array.isArray(c.exercises) ? c.exercises
               : (day && Array.isArray(day.ex) ? day.ex : []);
    var state = isObj(c.state) ? c.state : {};
    var dl = deloadStatus((c.deload !== undefined) ? { deload: c.deload } : state, today);

    var tw = trainingWeeks(sessions, today);
    var cw = calendarWeeks(sessions, today);
    var rw = planReducedWeeks(plan);
    var tier = planHasCutTier(plan);
    var tot = accessoryTotals(program, state);
    var lines = tierLines(tw, cw, tot.back, tot.cuts, sessions.length > 0, dl,
                          rw, tier, loggedSessions(sessions));

    var order = tier ? orderFor(dayId, exList, declaredOrder(plan, dayId)) : [];
    /* Inside the reduced-volume block: zero, and there is no override anywhere
       in the app. During a deload: zero, accessories are out (audit section 8).
       The counter is NOT decremented for a deload here - rollbackReintro is
       the only thing that moves it, and only on a stall or a trigger. */
    var n = (tw > rw && !dl.active) ? Math.min(counterOf(state, dayId), order.length) : 0;

    var inTier = {}, i, id;
    for (i = 0; i < exList.length; i++) {
      if (isObj(exList[i]) && !exList[i].cut) inTier[str(exList[i].id).trim()] = true;
    }
    for (i = 0; i < n; i++) inTier[order[i]] = true;

    var exerciseIds = [], prescribed = [], kept = [];
    for (i = 0; i < exList.length; i++) {
      if (!isObj(exList[i])) continue;
      id = str(exList[i].id).trim();
      if (id === "") continue;
      if (own(inTier, id)) { exerciseIds.push(id); prescribed.push(id); continue; }
      /* Hidden by the tier, but he has typed into it. It renders, it saves,
         and it is FLAGGED rather than dropped. */
      if (draftHas(c.draft, id)) { exerciseIds.push(id); kept.push(id); }
    }

    var out = notAbsent({
      dayId: dayId,
      trainingWeeks: tw,
      calendarWeeks: cw,
      exerciseIds: exerciseIds,
      prescribed: prescribed,
      kept: kept,
      reintroduced: order.slice(0, n),
      offer: null,
      offerLine: "",
      blocked: null,
      blockedLine: "",
      back: tot.back,
      cuts: tot.cuts,
      dayBack: n,
      dayCuts: order.length,
      statusLine: lines.status,
      tierLine: lines.divergence !== "" ? lines.divergence
                                        : ((tier && tw <= rw) ? lines.row : ""),
      tierNote: lines.explain,
      deload: { active: dl.active, day: dl.day }
    });
    if (!tier) markAbsent(out, V1_ABSENT);

    /* ---- the offer gate (audit section 5, addendum S2b) ---- */
    var stalled = (isObj(c.stallReport) && Array.isArray(c.stallReport.stalled))
      ? c.stallReport.stalled : [];
    var stamp = stampOf(state, dayId);
    var gap = stamp === null ? null : dayGap(stamp, today);

    if (dl.active) out.blocked = "deload";
    else if (dayId === "" || !order.length) out.blocked = "none";
    else if (tw <= rw) out.blocked = "week";
    else if (counterOf(state, dayId) >= order.length) out.blocked = "complete";
    else if (stalled.length) out.blocked = "stall";
    else if (painWindow(sessions, today, PAIN_DAYS).active) out.blocked = "pain";
    else if (gap !== null && gap < V1_COOLDOWN) out.blocked = "cooldown";
    else {
      id = order[n];
      out.offer = { exId: id, name: exNameIn(exList, id), dayId: dayId };
      out.offerLine = "Add " + out.offer.name + " back to this session? Only if last week left " +
                      "you recovered and no lift went backwards.";
    }

    /* The only thing the app may say about a pain note here, and it says it
       WITHOUT deciding anything about his body: he wrote it, it is inside 7
       days, so nothing new is added this week. No severity, no cause, no
       "rest", no substitute (addendum S2b, audit section 10). Nothing is
       stamped and nothing is rolled back - stamping would double the delay to
       14 days, and a rollback would let a keyword shrink his programme. */
    if (out.blocked === "pain") {
      out.blockedLine = "No new exercise this week. You logged pain in the last 7 days.";
    }
    return out;
  }

  /* acceptReintro(state, dayId, todayStr, max)
     declineReintro(state, dayId, todayStr)
       -> a NEW state object, or null.

     setCalChanged's shape: shallow copy, no mutation, no other key touched,
     null when `state` is not an object - and the caller MUST NOT write null
     over the store. `reintro` and `lastReintroDate` are copied one level down
     too, because those are the two maps being written.

     IDEMPOTENCE. Accept is an increment, so it cannot be idempotent by
     arithmetic; it is made idempotent by the rule instead. One addition per
     day id per calendar date is exactly what "one per session" means, so a
     second accept on a date already stamped only re-stamps. A double tap, a
     re-render or a replayed event cannot add two accessories.

     `max` is that day's cut count. Pass it and the counter can never run past
     the end of the list. */
  function acceptReintro(state, dayId, todayStr, max) {
    if (!isObj(state)) return null;
    var id = str(dayId).trim();
    var out = copyObj(state);
    if (id === "") return out;
    var today = safeToday(todayStr);
    var already = stampOf(state, id) === today;
    out.reintro = copyObj(state.reintro);
    out.lastReintroDate = copyObj(state.lastReintroDate);
    if (!already) {
      var n = counterOf(state, id) + 1;
      if (typeof max === "number" && isFinite(max) && max >= 0) n = Math.min(n, Math.floor(max));
      out.reintro[id] = n;
    }
    out.lastReintroDate[id] = today;
    return out;
  }

  function declineReintro(state, dayId, todayStr) {
    if (!isObj(state)) return null;
    var id = str(dayId).trim();
    var out = copyObj(state);
    if (id === "") return out;
    out.lastReintroDate = copyObj(state.lastReintroDate);
    out.lastReintroDate[id] = safeToday(todayStr);
    return out;
  }

  /* rollbackReintro(state, program, todayStr, sessions) -> a NEW state, or null.

     Audit section 5: when ST1 fires or D1 triggers, every day's counter drops
     by one, floor zero, AND HE IS TOLD. The telling is why this takes
     `program`: WO-003 W14 returns nothing, and the UI cannot render
     `Progress stalled. Pulling {ex} back out for now.` without the name of
     what was pulled (UX spec 1.6, blocking dependency 1).

     It records state.lastRollback = {exId, name, date, days, items}:
       exId/name  the FIRST exercise pulled, in programme order - the one the
                  line names
       items      every exercise pulled, one per day, so a UI that wants to
                  name them all can
       days       the training-day count at the moment of the rollback, so the
                  notice can disappear after the next session is logged rather
                  than on a timer

     ONCE PER DAY. A second call on a date already stamped is a no-op copy.
     A decrement inside a render loop would strip his programme one accessory
     per paint, and that is a data-shaped bug even though no set is lost.

     Nothing is rolled back when every counter is already zero, and nothing is
     stamped either: a notice about an exercise that was never added is the app
     inventing an event.

     `lastRollback` is a new key on the log store. It is ADDITIVE and
     absence-tolerant - every reader treats a missing key as null - so a
     schema-2 or schema-3 store loads unchanged and no migration is needed to
     read it. It is written only when a rollback actually happens. */
  function rollbackReintro(state, program, todayStr, sessions, plan) {
    if (!isObj(state)) return null;
    var today = safeToday(todayStr);
    var out = copyObj(state);
    var prev = isObj(state.lastRollback) ? state.lastRollback : null;
    if (prev && dateOrNull(prev.date) === today) return out;

    var src = isObj(state.reintro) ? state.reintro : {};
    var next = copyObj(src);
    var items = [], seen = {}, i, id, n, order, exId;
    var days = Array.isArray(program) ? program : [];
    for (i = 0; i < days.length; i++) {
      if (!isObj(days[i])) continue;
      id = str(days[i].id).trim();
      if (id === "" || own(seen, id)) continue;
      seen[id] = true;
      n = counterOf(state, id);
      if (n <= 0) continue;
      order = orderFor(id, days[i].ex, declaredOrder(plan, id));
      exId = order[n - 1] || null;
      next[id] = n - 1;
      items.push({ dayId: id, exId: exId, name: exId ? exNameIn(days[i].ex, exId) : "" });
    }
    /* A counter for a day this build's PROGRAM does not carry still comes
       down. Leaving it stranded would hold an exercise in a tier nobody can
       see or roll back. */
    Object.keys(src).forEach(function (k) {
      if (own(seen, k)) return;
      var m = counterOf(state, k);
      if (m > 0) next[k] = m - 1;
    });

    if (!items.length) return out;
    out.reintro = next;
    out.lastRollback = {
      exId: items[0].exId,
      name: items[0].name,
      date: today,
      days: Array.isArray(sessions) ? trainingDays(sessions, today).length : null,
      items: items
    };
    return out;
  }

  function rollbackLine(name) {
    var s = str(name).trim();
    return s === "" ? "" : "Progress stalled. Pulling " + s + " back out for now.";
  }

  /* rollbackNotice(state, sessions, todayStr) -> {show, exId, name, date, text}

     The notice stands until the next session is logged; from then on the lower
     accessory count in the cycle line carries the fact (UX spec 1.6). With no
     `days` snapshot recorded it shows until one is - a visible true statement
     is the safe failure. */
  function rollbackNotice(state, sessions, todayStr) {
    var out = { show: false, exId: null, name: "", date: null, text: "" };
    var r = isObj(state) ? state.lastRollback : null;
    if (!isObj(r)) return out;
    out.exId = typeof r.exId === "string" ? r.exId : null;
    out.name = str(r.name);
    out.date = dateOrNull(r.date);
    out.text = rollbackLine(out.name);
    if (out.text === "") return out;
    if (typeof r.days === "number" && isFinite(r.days) && Array.isArray(sessions)) {
      out.show = trainingDays(sessions, safeToday(todayStr)).length <= r.days;
    } else {
      out.show = true;
    }
    return out;
  }

  /* ===================================================== Rule D1 - W19
     The deload. audit section 8, with the counting ruling in addendum 6c.

     THERE IS NO SCHEDULED DELOAD, and this file must never invent one. PHAT as
     published contains none; the brief already builds the ramp a lifter new to
     this volume needs, in the 4-week cut block. A deload here is triggered by
     EVIDENCE and it is always RECOMMENDED, never imposed: nothing in this
     section starts one. startDeload only runs when he taps.

     Nothing renders at all below trainingWeeks 6 - not a banner, not the word.
     A deload recommended to a man six sessions in teaches him to ignore the
     banner, which costs the one that matters later (audit section 8).

     A DELOAD CHANGES THE PRESCRIPTION, NOT THE LOG. deloadCheck reads
     sessions and mutates nothing. Starting, declining and ending write the
     `deload` key and nothing else: every session, set, note and bodyweight row
     is byte-identical before and after. And because a deload renders two set
     rows, endDeload exists so he is never left unable to log a third set he
     actually did (UX spec 2.5, blocking dependency 2). */

  var DELOAD_DAYS = 7;       /* a deload week is a week                    */
  var DELOAD_SETS = 2;       /* same weights, fewer sets                   */
  var DELOAD_SHORT = 2;      /* stop this many reps short of hi            */
  var D1_WEEKS = 6;          /* below this: no deload language at all      */
  var D1_T3_WEEKS = 9;       /* the calendar backstop                      */
  var D1_RUN = 2;            /* consecutive failing DATES for T1           */
  /* The rep clause is SCOPED TO POWER DAYS, because the prescription is
     (addendum §7.3). `hi − 2` is not a meaningful instruction on a hypertrophy
     slot: on a 3 × 8–12 it prescribes 10, which is inside the range he was
     already working in, and the load is unchanged, so nothing is reduced. The
     lever that cuts fatigue on a hypertrophy day is set count and exercise
     count, and the deload already cuts both. These two strings previously
     stated a prescription deloadEx does not give, on a screen he can see the
     card on the same day. Four pinned WO-003 criteria moved with them; the
     rule did not change, the sentence describing it became accurate. */
  var D1_TAIL = "Take a deload week: same weights, 2 sets. On power days stop 2 reps short. Resume where you left off.";
  var D1_ACTIVE_TAIL = "Same weights, 2 sets. Power days stop 2 reps short. Do not chase numbers this week.";
  var D1_ENDED = "Deload done. Back to full sets at your last working loads.";
  var D1_DECLINED = "Noted. Asked again after the next session.";

  /* Rule C7a's copy for D1 (addendum 8.4), verbatim. Plan screen only.
     It states what is off AND what still works, because "the app cannot spot a
     stall" on its own reads as a fault rather than a consequence of the plan
     he built. */
  var D1_ABSENT = [
    "This plan names no key lifts, so the app cannot spot a stall or recommend a deload from " +
    "your numbers. It will still flag nine straight weeks without a lighter one."
  ];
  var D1_T3_GENERIC = "Nine weeks straight with no lighter week. Take one: same weights, two sets " +
                      "per exercise, stop two reps short of the top of the range.";

  /* THE EFFECTIVE END OF A DELOAD WEEK: max(startDate, endDate). One rule, and
     every consumer reads it (addendum §7.11 rider).

     A stored end earlier than its own start is an impossible record, and the
     two things that read it fail in opposite directions if they disagree about
     what it means:
       - E2's window: a wild window EXCLUDES evidence, so it would silently
         delete weeks of real training from ST1 and T1 and print `Not enough
         sessions on Row to judge` for a month with nothing to diagnose;
       - deloadStatus().last feeds `since`, which is T2's freshness gate and
         T3's week count. A `last` before the deload's own start makes T2
         fireable sooner and T3's count longer - both EAGER, and eager is the
         wrong direction for something the app only ever recommends.
     Collapsing costs at most one day of evidence, and a corrupt record can
     never report `active` because it always resolves to an ended one.

     null in (still running) is null out. It is never widened, only narrowed. */
  function deloadEndOf(startStr, endStr) {
    if (endStr === null || startStr === null) return endStr;
    return endStr < startStr ? startStr : endStr;
  }

  /* deloadStatus(state, todayStr)
       -> {active, day, startDate, endDate, ended, last, trigger, declinedAt,
           declinedDays, text, endedLine}

     `state.deload` is null until he starts or declines one. Shape:
       { startDate, endDate, trigger, declinedAt, declinedDays, past:[...] }

     A deload that ran its seven days is over whether or not anything stamped
     it - the phone may have been closed all week - so the end date is implied
     from the start when no explicit one was written. `last` is the date the
     most recent deload finished and is what the cycle line prints. */
  function deloadStatus(state, todayStr) {
    var today = safeToday(todayStr);
    var out = {
      active: false, day: null, startDate: null, endDate: null, ended: false,
      last: null, trigger: null, declinedAt: null, declinedDays: null,
      text: "", endedLine: ""
    };
    var d = isObj(state) ? state.deload : null;
    if (!isObj(d)) return out;
    out.trigger = typeof d.trigger === "string" ? d.trigger : null;
    out.declinedAt = dateOrNull(d.declinedAt);
    out.declinedDays = (typeof d.declinedDays === "number" && isFinite(d.declinedDays))
      ? d.declinedDays : null;

    var s = dateOrNull(d.startDate);
    if (s === null) return out;
    out.startDate = s;
    var lastDay = dateAdd(s, DELOAD_DAYS - 1);
    var e = dateOrNull(d.endDate);
    if (e === null && lastDay !== null && today > lastDay) e = lastDay;
    e = deloadEndOf(s, e);                       /* corrupt record - addendum §7.11 rider */
    out.endDate = e;

    if (e === null) {
      if (today < s) return out;                 /* stamped ahead of itself */
      out.active = true;
      var g = dayGap(s, today);
      out.day = Math.min(DELOAD_DAYS, (g === null ? 0 : g) + 1);
      out.text = "Deload week, day " + out.day + ". " + D1_ACTIVE_TAIL;
      return out;
    }
    out.ended = true;
    out.last = e;
    out.endedLine = D1_ENDED;
    return out;
  }

  /* ------------------------------------------------------------- E2 */

  /* Rule E2 (addendum §7.7 N2) — A DELOAD DATE IS NOT EVIDENCE.

     A deload set is the same weight stopping two reps short, so on a 3–5 slot
     100×3 against 100×5 is an Epley 110.0 against 116.7 — 5.7% lower, more
     than TWICE ST1's 2.5% threshold. Left in the pool, the Trend tab reports
     `Week 12 and no progress on Row, Squat … Either the sets aren't close
     enough to failure, or you aren't eating enough` two weeks after the app
     itself told him to stop short. That is the app blaming him for obeying it:
     B-07 arriving through a door B-07 did not know about.

     A session dated inside any window contributes:
       - no e1RM sample to either ST1 block, and no distinct date to either
         block's >= 2 minimum (stallReport);
       - no row to E1's ladder — not COMPLETE, not FAIL, not SHORT. It is
         SKIPPED, so it neither resets the run nor extends it. An abandoned
         date is an unknown and resets; a deload date is a known non-attempt
         and is invisible. Different facts, different handling.

     NOT applied to Rule SP1: R is the heaviest set at 3–5 reps and a deload
     does not lower the weight, so a deload set is a valid observation of load,
     and excluding it could drop a real number to the no-data fallback.
     NOT applied to Rule TW1: a deload week is a week he trained.
     Do not extend it to either.

     `past` plus the current one, whether it is running or finished. An
     unstamped end is IMPLIED from the start exactly as deloadStatus implies
     it — the phone may have been shut all week. */

  /* The deload record out of either shape a caller has: the app state
     ({deload:…}) or the bare deload object. Callers hold one or the other and
     must not have to know which this wants. */
  function deloadOf(v) {
    if (!isObj(v)) return null;
    if (isObj(v.deload)) return v.deload;
    if (own(v, "startDate") || own(v, "past")) return v;
    return null;
  }

  function deloadWin(d) {
    if (!isObj(d)) return null;
    var s = dateOrNull(d.startDate);
    if (s === null) return null;
    var e = dateOrNull(d.endDate);
    if (e === null) e = dateAdd(s, DELOAD_DAYS - 1);
    e = deloadEndOf(s, e);
    return { from: s, to: e === null ? s : e };
  }

  /* deloadWindows(state) -> [{from, to}] ascending by start. */
  function deloadWindows(state) {
    var out = [];
    var d = deloadOf(state);
    if (!isObj(d)) return out;
    var list = Array.isArray(d.past) ? d.past.slice(0) : [];
    list.push(d);
    for (var i = 0; i < list.length; i++) {
      var w = deloadWin(list[i]);
      if (w !== null) out.push(w);
    }
    out.sort(function (a, b) { return a.from < b.from ? -1 : (a.from > b.from ? 1 : 0); });
    return out;
  }

  function inDeload(date, wins) {
    if (!Array.isArray(wins) || typeof date !== "string") return false;
    for (var i = 0; i < wins.length; i++) {
      if (date >= wins[i].from && date <= wins[i].to) return true;
    }
    return false;
  }

  /* [{date, e}] with every deload date dropped. A new array; the rows are the
     caller's own objects and are not written to. */
  function dropDeloadRows(rows, wins) {
    if (!Array.isArray(wins) || !wins.length) return rows;
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (!inDeload(rows[i].date, wins)) out.push(rows[i]);
    }
    return out;
  }

  /* Weeks of >= 3 training days AFTER `sinceStr` (exclusive), or all of them
     when it is null. T3's "9 CONSECUTIVE trainingWeeks with no deload taken"
     is this count: the clock restarts when a deload finishes. TW1 unchanged
     otherwise (addendum 6d). */
  function weeksSince(sessions, todayStr, sinceStr) {
    var days = trainingDays(sessions, todayStr);
    var by = {}, n = 0, i, w;
    for (i = 0; i < days.length; i++) {
      if (sinceStr !== null && days[i] <= sinceStr) continue;
      w = weekStart(days[i]);
      if (w === null) continue;
      by[w] = (by[w] || 0) + 1;
    }
    Object.keys(by).forEach(function (k) { if (by[k] >= TRAINING_WEEK_MIN) n++; });
    return n;
  }

  /* Rule E1 (addendum §7.6) — T1's evidence ladder, one row per DISTINCT DATE,
     ascending (addendum 6c). Supersedes "half-finished dates are SKIPPED".

     A row exists for every distinct date on which the lift holds at least ONE
     completed set (Rule Z1). Dates he did not train the lift at all are not
     rows. Deload dates are not rows either (Rule E2) — skipped entirely, so
     they neither reset the run nor extend it.

       evaluable  some entry on the date holds >= s completed sets. False is
                  the SHORT row: he logged the lift and stopped early.
       full       some entry on it holds >= s completed sets AND all of its
                  first s reach `lo`. A date counts as COMPLETE if ANY entry on
                  it completed the prescription, and as a failure only when
                  every evaluable entry on it failed — two saves on one date
                  are ONE row, and a correction saved beside its original must
                  not read as two consecutive failures (addendum 6c, and it
                  survives B-05, where corrections arrive as extra rows before
                  they arrive as edits).
       fullLoad / failLoad   the heaviest working load on that date on each
                  side, through workingLoadStrict: a load read off a session he
                  abandoned after one set is a confident wrong number with no
                  tell (B-24). */
  function d1Rows(sessions, exId, s, lo, todayStr, sinceStr, windows) {
    var out = [];
    if (!Array.isArray(sessions)) return out;
    var today = safeToday(todayStr);
    var wins = Array.isArray(windows) ? windows : [];
    var by = {}, i, j, ses, d, e, C, load, full, rec;
    for (i = 0; i < sessions.length; i++) {
      ses = sessions[i];
      d = sessionDate(ses);
      if (d === "" || d > today) continue;
      if (sinceStr !== null && d <= sinceStr) continue;
      if (inDeload(d, wins)) continue;           /* E2 - not a row at all */
      if (!isObj(ses) || !isObj(ses.entries) || !own(ses.entries, exId)) continue;
      e = ses.entries[exId];
      if (!isObj(e) || !Array.isArray(e.sets)) continue;
      C = completedSets(e.sets);
      if (!C.length) continue;                   /* the lift was not trained */
      if (!own(by, d)) {
        by[d] = { date: d, evaluable: false, full: false, fullLoad: null, failLoad: null };
      }
      rec = by[d];
      load = workingLoadStrict(e.sets, s);
      if (load === null) continue;               /* SHORT - the row stands, this entry is not evidence */
      rec.evaluable = true;
      C = C.slice(0, s);
      full = true;
      for (j = 0; j < C.length; j++) {
        if (C[j].r < lo) full = false;
      }
      if (full) {
        rec.full = true;
        if (rec.fullLoad === null || load > rec.fullLoad) rec.fullLoad = load;
      } else if (rec.failLoad === null || load > rec.failLoad) {
        rec.failLoad = load;
      }
    }
    Object.keys(by).sort().forEach(function (k) { out.push(by[k]); });
    return out;
  }

  /* E1 clause (c), as restated in addendum §7.10. For the FAIL test on a
     failing date F, `best` is the maximum working load over that lift's
     COMPLETE dates that are BOTH strictly earlier than F AND on or after
     F − ST1_PRIOR_FROM days.

     IT IS THE WINDOWED MAXIMUM, NOT A RECENCY GATE ON THE ALL-TIME MAXIMUM,
     and the difference is the whole ruling. A completion outside the window is
     not consulted IN EITHER DIRECTION: it neither qualifies a failure nor
     silences one. Gating the all-time max on its own date would mean a lifter
     who ALSO owns an older, heavier PR is silenced by owning it — two men fail
     120 kg twice this month, both completed 120 kg ten days ago, and the one
     who hit 125 kg last year gets nothing while the one who never did gets the
     trigger. Same present-day evidence, opposite outputs, decided by history
     with no bearing on whether he can do 120 kg today.

     This is not "more sensitive" as a rule. All-time 140 kg a year ago, only
     in-window completion 100 kg, now failing 120 kg twice: 120 > 100, so
     MISS-NEW and no trigger. He has not recently demonstrated 120 kg, so
     failing it is an attempt.

     Strictly earlier, because "previously" means previously: a load completed
     ON or AFTER the failing date does not make the failure retroactively count
     (addendum §7.5). The 41 days are ST1's prior block reused, not a new
     number; what they encode is "a load he has RECENTLY demonstrated", and a
     demonstration from a year ago is not one (N4). */
  function bestWithin(done, onDate, days) {
    var m = null, g, i;
    for (i = 0; i < done.length; i++) {
      if (done[i].date >= onDate) continue;
      g = dayGap(done[i].date, onDate);
      if (g === null || g > days) continue;
      if (m === null || done[i].load > m) m = done[i].load;
    }
    return m;
  }

  /* T1: two consecutive failing DATES on one key lift, at a load he has
     already completed for the full prescription. The load clause is what
     keeps normal progression out of it: failing 3 sets at a new heavier
     weight is a Tuesday, not a deload.

     CONSECUTIVE MEANS ADJACENT IN HIS TRAINING, not adjacent among the dates
     the app can read (Rule E1). A SHORT date resets the run: `fail, abandoned,
     fail` is not two consecutive failures, it is two failures with an unknown
     between them, and the correct response to an unknown is to get another
     data point rather than prescribe a week of reduced stimulus. He gives the
     app that data point on the next session, and `fail, abandoned, fail, fail`
     fires on the third and fourth.

     `lift.s` and `lift.lo` are the PROGRAMME's, never a deloaded exercise's —
     see the guard in deloadCheck.

     Three recency clauses, all required, all on ST1's own constants:
       (a) the two failing dates <= ST1_RECENT days apart
       (b) the later failing date within ST1_RECENT days of today
       (c) inside bestWithin: the completed load it is measured against was
           completed within ST1_PRIOR_FROM days of it. */
  function d1T1(sessions, lift, todayStr, sinceStr, windows) {
    if (!isObj(lift)) return null;
    if (lift.dl === 1) return null;              /* a deloaded prescription - see deloadCheck */
    var id = str(lift.id).trim();
    var s = lift.s, lo = lift.lo;
    if (id === "") return null;
    if (typeof s !== "number" || !isFinite(s) || s < 1) return null;
    if (typeof lo !== "number" || !isFinite(lo) || lo < 1) return null;
    var today = safeToday(todayStr);
    var rows = d1Rows(sessions, id, Math.floor(s), lo, today, sinceStr, windows);
    var done = [];                               /* every COMPLETE date, ascending */
    var run = 0, prevFail = null, i, r, best, g;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];

      if (!r.evaluable) {                        /* SHORT - breaks the streak */
        run = 0; prevFail = null; continue;
      }
      if (r.full) {                              /* COMPLETE */
        run = 0; prevFail = null;
        done.push({ date: r.date, load: r.fullLoad });
        continue;
      }
      if (r.failLoad === null) { run = 0; prevFail = null; continue; }

      best = bestWithin(done, r.date, ST1_PRIOR_FROM);          /* clause (c) */
      if (best === null || r.failLoad > best + 1e-9) {          /* MISS-NEW */
        run = 0; prevFail = null; continue;
      }

      /* FAIL. Clause (a): too far from the previous failure and this one
         STARTS a run rather than continuing it - absence is not fatigue. */
      g = (prevFail === null) ? null : dayGap(prevFail, r.date);
      run = (g !== null && g <= ST1_RECENT) ? run + 1 : 1;
      prevFail = r.date;

      if (run >= D1_RUN) {                                      /* clause (b) */
        g = dayGap(r.date, today);
        if (g !== null && g <= ST1_RECENT) return { date: r.date };
      }
    }
    return null;
  }

  /* deloadCheck(ctx) -> {trigger:"T1"|"T2"|"T3"|null, text, x2, lifts,
                          rollback, reason, provenance,
                          absent, absentLines, absentLine}

     ctx = { sessions, todayStr, stallReport, keyLifts, state, deload, plan }

     A context object, for the same reason volumeTier takes one: WO-003 W19's
     positional signature cannot evaluate T1 without each key lift's `s` and
     `lo`, and those live in PROGRAM. `keyLifts` is [{id, n, s, lo}] - the
     caller's KEY_LIFTS joined to its PROGRAM. WHICH lifts are key is settled
     (audit section 12) and is not decided here.

     `rollback` is true for T2 and tells the caller to pair this with V1's
     rollback line: audit section 8 example 3 says both are correct and both
     should be stated. This function does not write that line, because the
     exercise being pulled is rollbackReintro's to name.

     `reason` says why nothing fired when nothing did: "early" (below week 6),
     "active", "declined", "deloaded-lifts", or null for "no trigger". Never
     throws; a thrown banner is a spurious recommendation and those cost trust
     (UX spec 2.6).

     A `reason` IS NOT COPY AND MUST NEVER BE RENDERED. `trigger === null` means
     no banner, full stop, and `text` and `x2` are "" and `lifts` is empty on
     every one of those paths — this function produces no string it does not
     intend to be read aloud. "deloaded-lifts" in particular is a developer
     signal about a bug in the CALLER, not a fact about his training, and there
     is no honest sentence to print for it (addendum §7.11). It is deliberately
     distinct from "active", which is the ordinary state during a real deload
     week and is reached first.

     ABSENT, Rule C7a (addendum 8.4). D1's three triggers split by what they
     read, and only two of them need the plan to declare anything:

       T1 performance drop   key lifts, per-lift history   -> SILENT on a plan
                             with none. "Went backwards" has no subject.
       T2 broad stall        ST1 on the key lifts          -> SILENT. ST1 is
                             itself ABSENT.
       T3 calendar backstop  dates only, via trainingWeeks -> RUNS. Nine
                             training weeks with no lighter one is a fact about
                             the calendar, and it is defensible advice to any
                             lifter on any plan.

     T3's COPY is gated on provenance, not its firing: PHAT's version names
     power days and cut accessories, and a plan with no cut tier has no
     accessories to pull and may have no day the app can call a power day.
     Reducing sets and backing off failure translates to any plan; PHAT's day
     structure does not.

     `plan` is OPTIONAL and defaults to the shipped PHAT plan. `keyLifts` still
     wins when given, because the caller joins them to the week's PROGRAM. */
  function deloadCheck(ctx) {
    var c = isObj(ctx) ? ctx : {};
    var out = notAbsent({ trigger: null, text: "", x2: "", lifts: [], rollback: false,
                          reason: null, provenance: null });
    var sessions = Array.isArray(c.sessions) ? c.sessions : [];
    var today = safeToday(c.todayStr);
    var state = isObj(c.state) ? c.state : {};
    var plan = isPlanDoc(c.plan) ? c.plan : PHAT_PLAN;
    var dsrc = (c.deload !== undefined) ? { deload: c.deload } : state;
    var dl = deloadStatus(dsrc, today);
    var wins = deloadWindows(dsrc);              /* Rule E2 */

    out.provenance = phatProvenance(plan) ? "phat" : "generic";
    /* Checked before every other gate: absence is a property of the PLAN and
       is true on day zero with an empty log, so it must not depend on reaching
       week 6 first. */
    if (!(Array.isArray(c.keyLifts) ? c.keyLifts : planKeyLifts(plan)).length) {
      markAbsent(out, D1_ABSENT);
    }

    if (trainingWeeks(sessions, today) < D1_WEEKS) { out.reason = "early"; return out; }
    if (dl.active) { out.reason = "active"; return out; }

    /* Declined: the check re-runs after the NEXT session, not on the next
       render. Re-asking immediately is how a recommendation becomes noise. */
    if (dl.declinedAt !== null && dl.declinedDays !== null &&
        trainingDays(sessions, today).length <= dl.declinedDays) {
      out.reason = "declined";
      return out;
    }

    var since = dl.last;
    var lifts = Array.isArray(c.keyLifts) ? c.keyLifts : planKeyLifts(plan);
    var i, l, name;

    /* THE BINDING CONSTRAINT (addendum §7.4). The deloaded exercise goes to the
       card and to verdict() and TO NOTHING ELSE. d1T1 reads lift.s and lift.lo
       from here, so one deloaded lift in this list would shift the whole T1
       evidence ladder to s = 2 and start reading two-set weeks as full ones.
       deloadEx stamps every prescription it alters with `dl:1`, and this
       refuses to answer at all rather than answering off the wrong ladder —
       silently returning "no trigger" would be the same class of defect as the
       bug it guards. `reason` names it so a caller and a test can see it.
       keyLifts is the caller's KEY_LIFTS joined to PROGRAM, never to the
       week's prescription. */
    for (i = 0; i < lifts.length; i++) {
      if (isObj(lifts[i]) && lifts[i].dl === 1) {
        out.reason = "deloaded-lifts";
        return out;
      }
    }

    /* T1 - the most specific trigger, so it is checked first. */
    for (i = 0; i < lifts.length; i++) {
      l = lifts[i];
      if (!isObj(l)) continue;
      if (d1T1(sessions, l, today, since, wins) === null) continue;
      name = (typeof l.n === "string" && l.n.trim() !== "") ? l.n : str(l.id);
      out.trigger = "T1";
      out.lifts = [name];
      out.text = "Two sessions where " + name + " went backwards. " + D1_TAIL;
      return out;
    }

    /* T2 - ST1 stalled on >= 2 of the 4 key lifts. Suppressed until ST1's own
       recent block sits entirely after the last deload: before that the report
       is still reading the weeks that produced the last recommendation, and it
       would re-fire the day the deload ended. The window is ST1's own, not a
       new number. */
    var stalled = (isObj(c.stallReport) && Array.isArray(c.stallReport.stalled))
      ? c.stallReport.stalled : [];
    var rFrom = dateAdd(today, -ST1_RECENT);
    var t2Fresh = (since === null) || (rFrom !== null && rFrom > since);
    if (stalled.length >= 2 && t2Fresh && !out.absent) {
      out.trigger = "T2";
      out.lifts = stalled.slice(0);
      out.rollback = true;
      /* ST1's own vocabulary for the same finding on the same day (addendum
         §7.1). The Trend tab says `Week 7 and no progress on Row, Squat.` and
         this said `Row and DB press have both stalled.` — one app, two words
         for one event, and ST1's wording is fixed by the brief, so the banner
         moved. The `both`/`all` branch is gone with it: andList needs no
         grammatical switch and a second string is a second thing to get wrong.
         `rollback` still tells the caller to render V1's own rollback line as a
         SECOND LINE. It is never joined to this sentence and it is not written
         here, because the exercise being pulled is rollbackReintro's to name. */
      out.text = "No progress on " + andList(stalled) + ". " + D1_TAIL;
      return out;
    }

    /* T3 - the calendar backstop, in TRAINING weeks. The only trigger that
       survives a plan the app did not verify, because it reads dates and
       nothing else. Its copy is the part that has to change: PHAT's version
       is unchanged, and the foreign version drops the day structure and
       restates the deload in terms any plan has - same weights, two sets,
       two reps short of the top of the range. */
    if (weeksSince(sessions, today, since) >= D1_T3_WEEKS) {
      out.trigger = "T3";
      out.text = (out.provenance === "phat")
        ? "Nine weeks straight. Take a deload week before something makes you."
        : D1_T3_GENERIC;
      return out;
    }
    return out;
  }

  /* startDeload(state, todayStr, trigger)
     declineDeload(state, todayStr, sessions)
     endDeload(state, todayStr)
       -> a NEW state object, or null.

     setCalChanged's shape throughout: shallow copy, no mutation, idempotent,
     null when `state` is not an object, and the ONLY key any of them writes is
     `deload`. Sessions, notes, bodyweight and the stored `includeCut` come out
     byte-identical - W19's data-loss criterion, asserted on the serialized log.

     A finished deload is pushed onto `past` before a new one starts, so the
     record of a week he actually took is never overwritten.

     declineDeload snapshots the training-day count rather than a date: the
     check re-runs when a NEW session exists, which is what "asked again after
     the next session" means, and it cannot be defeated by the clock.

     endDeload is the way out (UX spec 2.5). Without it a deload renders two
     set rows for seven days and he has nowhere to put a third set he actually
     did - the app being wrong about his numbers, which is the thing this batch
     exists to stop. Idempotent: with no deload active it returns an unchanged
     copy, so a double tap cannot stamp an end over a completed one. */
  function startDeload(state, todayStr, trigger) {
    if (!isObj(state)) return null;
    var today = safeToday(todayStr);
    var out = copyObj(state);
    var cur = deloadStatus(state, today);
    if (cur.active && cur.startDate === today) return out;   /* already started today */
    var d = isObj(state.deload) ? state.deload : null;
    var past = (d && Array.isArray(d.past)) ? d.past.slice(0) : [];
    if (d && dateOrNull(d.startDate) !== null && !cur.active) {
      past.push({ startDate: cur.startDate, endDate: cur.endDate, trigger: cur.trigger });
    }
    out.deload = {
      startDate: today,
      endDate: null,
      trigger: (typeof trigger === "string" && trigger.trim() !== "") ? trigger.trim() : null,
      declinedAt: null,
      declinedDays: null,
      past: past
    };
    return out;
  }

  function declineDeload(state, todayStr, sessions) {
    if (!isObj(state)) return null;
    var today = safeToday(todayStr);
    var out = copyObj(state);
    var d = isObj(state.deload) ? state.deload : null;
    var n = Array.isArray(sessions) ? trainingDays(sessions, today).length
          : ((typeof sessions === "number" && isFinite(sessions) && sessions >= 0)
              ? Math.floor(sessions) : 0);
    out.deload = {
      startDate: d ? (dateOrNull(d.startDate)) : null,
      endDate: d ? (dateOrNull(d.endDate)) : null,
      trigger: (d && typeof d.trigger === "string") ? d.trigger : null,
      declinedAt: today,
      declinedDays: n,
      past: (d && Array.isArray(d.past)) ? d.past.slice(0) : []
    };
    return out;
  }

  function endDeload(state, todayStr) {
    if (!isObj(state)) return null;
    var today = safeToday(todayStr);
    var out = copyObj(state);
    var cur = deloadStatus(state, today);
    if (!cur.active) return out;                 /* nothing to end */
    var d = isObj(state.deload) ? state.deload : {};
    out.deload = {
      startDate: cur.startDate,
      endDate: today,
      trigger: cur.trigger,
      declinedAt: null,
      declinedDays: null,
      past: Array.isArray(d.past) ? d.past.slice(0) : []
    };
    return out;
  }

  /* deloadEx(ex, active) -> the exercise as PRESCRIBED this week.

     A NEW object; `ex` is never mutated. Content, audit section 8: same
     weights, 2 sets, and ON POWER DAYS stop 2 reps short of hi. Speed work is
     returned unchanged - it is already submaximal and low-fatigue - and cut:1
     accessories are dropped by volumeTier, not here.

     `hi` is only pulled in on POWER slots, which is the only place the audit
     names a rep change, and it is never below `lo`. On a hypertrophy slot
     `hi - 2` would prescribe 10 reps on an 8-12 exercise - inside the range he
     was already working in, at an unchanged load, so it reduces nothing - and
     it would move H1 case 2's trigger with it, printing `All sets above 10. Go
     to 45 kg next session.` in the middle of a deload week. The levers that
     cut fatigue on a hypertrophy day are set count and exercise count, and the
     deload already cuts both (addendum §7.3).

     THE VERDICT GATE. verdict(ctx) gates on ex.s, so the card and the verdict
     see the same prescription: the deloaded one. Gating on 3 while prescribing
     2 withholds his verdict for the whole week. Sets he logs beyond the
     prescription still render and still save - the deload changes what he is
     asked for, never what he did. verdict() derives this itself from
     ctx.deload, so it cannot be handed the wrong object.

     `dl:1` MARKS THE OUTPUT, in the shape of `cut:1`, and it is not
     decoration. §7.4's binding constraint is that this object reaches the card
     and verdict() and NOTHING ELSE: d1T1 reads lift.s and lift.lo from its
     caller, and a deloaded lift there would shift T1's whole evidence ladder
     to s = 2. The mark makes that mistake detectable instead of silent -
     deloadCheck refuses to run on a marked lift - and it makes this function
     idempotent, so applying it twice cannot lower `hi` twice on a slot whose
     lo is more than 2 below its hi. It is enumerable on purpose: it survives
     copyObj and JSON, so a marked prescription cannot launder itself clean. */
  function deloadEx(ex, active) {
    if (!isObj(ex) || active !== true || ex.k === "speed") return ex;
    if (ex.dl === 1) return ex;                  /* already deloaded */
    var out = copyObj(ex);
    if (typeof ex.s === "number" && isFinite(ex.s) && ex.s > DELOAD_SETS) out.s = DELOAD_SETS;
    if (ex.k === "power" && typeof ex.hi === "number" && isFinite(ex.hi) &&
        typeof ex.lo === "number" && isFinite(ex.lo)) {
      out.hi = Math.max(ex.lo, ex.hi - DELOAD_SHORT);
    }
    out.dl = 1;
    return out;
  }

  /* cycleLine(ctx) -> {text, row, divergence, explain, trainingWeeks,
                        calendarWeeks, back, cuts, deload}

     ctx = { sessions, todayStr, state, program, deload }

     The one programme-state line on the Train screen, chosen by precedence
     (UX spec 1.2, which resolves audit section 5's status line against
     section 8's cycle line - at week 7 the second contains the first and
     printing both is the app repeating itself to a man trying to pick a day).

       no sessions          ""                    (the first-run copy stands)
       tw 0, sessions       reduced volume until ...
       tw 1-4               Week n of 4 at reduced volume ...
       tw 5                 Week 5 - n of 9 accessories back in.
       tw 5, all back       Full volume. All 9 accessories are in.
       tw 6+                Week n - full volume phase - ... - last deload: ...
       deload active        Deload week, day n. ...

     An object, not a bare string: `divergence` and `explain` render beneath
     it whenever the calendar week and the training week differ, and the
     caller needs the numbers for its own layout. Render `.text`.

     The word "deload" cannot appear below trainingWeeks 6 - no row under that
     contains it, and a deload cannot be active because nothing could have
     recommended one (UX spec 2.1 rule 3).

     `last deload:` prints through dayMon, never Intl: en-GB short month is
     "Sept" on current ICU and the signed-off copy says "Sep" (B-44). */
  function cycleLine(ctx) {
    var c = isObj(ctx) ? ctx : {};
    var today = safeToday(c.todayStr);
    var sessions = Array.isArray(c.sessions) ? c.sessions : [];
    var state = isObj(c.state) ? c.state : {};
    var program = Array.isArray(c.program) ? c.program : null;
    var plan = isPlanDoc(c.plan) ? c.plan : PHAT_PLAN;
    var dl = deloadStatus((c.deload !== undefined) ? { deload: c.deload } : state, today);
    var tw = trainingWeeks(sessions, today);
    var cw = calendarWeeks(sessions, today);
    var rw = planReducedWeeks(plan);
    var tier = planHasCutTier(plan);
    var nSess = loggedSessions(sessions);
    var tot = program ? accessoryTotals(program, state) : {
      back: (typeof c.back === "number" && isFinite(c.back)) ? c.back : 0,
      cuts: (typeof c.cuts === "number" && isFinite(c.cuts)) ? c.cuts : 0
    };
    var lines = tierLines(tw, cw, tot.back, tot.cuts, sessions.length > 0, dl,
                          rw, tier, nSess);
    var out = notAbsent({
      text: lines.row,
      row: lines.row,
      divergence: lines.divergence,
      explain: lines.explain,
      trainingWeeks: tw,
      calendarWeeks: cw,
      sessions: nSess,
      back: tot.back,
      cuts: tot.cuts,
      reason: null,
      deload: { active: dl.active, day: dl.day, last: dl.last, ended: dl.ended }
    });
    /* ABSENT (Rule C7a): the volume-phase clause is OMITTED and NO absent copy
       is offered in its place. `absentLines` is deliberately empty here - this
       line lives at the top of Home, and the one sentence about a missing
       volume tier belongs on the plan screen, said once, by volumeTier. The
       flag exists so a caller and a test can see WHY the clause is gone. */
    if (!tier) { out.absent = true; out.reason = "no-cut-tier"; }
    return out;
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
    sessionHasCompletedSet: sessionHasCompletedSet,
    sortSessions: sortSessions,
    weekStart: weekStart,
    dateAdd: dateAdd,
    dayGap: dayGap,
    dayMon: dayMon,
    TRAINING_WEEK_MIN: TRAINING_WEEK_MIN,
    trainingDays: trainingDays,
    trainingWeeks: trainingWeeks,
    liftDays: liftDays,
    lastFor: lastFor,
    /* ---- the plan document — WO-004 W2. Identity, editing, grouping.
       Every editor is pure: it returns a NEW plan and mutates nothing. An id
       is opaque, minted once, and never derived from or rewritten by a name.
       `lift` groups two ids into one movement for the Trend tab ONLY; every
       per-exercise engine still reads history by `id`. */
    PHAT_PLAN_ID: PHAT_PLAN_ID,
    PHAT_PLAN: PHAT_PLAN,
    PLAN_KINDS: PLAN_KINDS,
    PLAN_IMPLEMENTS: PLAN_IMPLEMENTS,
    mintId: mintId,
    takenIds: takenIds,
    newExId: newExId,
    newDayId: newDayId,
    newLiftId: newLiftId,
    planIdOf: planIdOf,
    exById: exById,
    dayIdOfEx: dayIdOfEx,
    liftOf: liftOf,
    exIdsForLift: exIdsForLift,
    liftName: liftName,
    planLifts: planLifts,
    validatePlan: validatePlan,
    renameExercise: renameExercise,
    renameDay: renameDay,
    addExercise: addExercise,
    addDay: addDay,
    moveExercise: moveExercise,
    removeExercise: removeExercise,
    copyPlan: copyPlan,
    clonePlan: clonePlan,
    normalisePlanStore: normalisePlanStore,
    /* ---- the plan-scoped rule tables — WO-004 W3. The four programme
       tables that used to be constants in this file. Every reader reconciles:
       an id the table names that the plan no longer contains is dropped, so no
       engine is ever handed a dangling id. phatProvenance is Rule C7b's gate —
       whether the app may speak the brief's diagnosis about this plan. */
    PLAN_KEYLIFT_MAX: PLAN_KEYLIFT_MAX,
    planSpeedSource: planSpeedSource,
    planReintroOrder: planReintroOrder,
    planKeyLiftIds: planKeyLiftIds,
    planKeyLifts: planKeyLifts,
    planHasCutTier: planHasCutTier,
    planReducedWeeks: planReducedWeeks,
    phatProvenance: phatProvenance,
    /* advice — W5/W6. Pure, DOM-free, storage-free, callable from tests.html
       over file://. The rule each one implements is named at its definition. */
    completedSets: completedSets,
    vol: vol,
    topSet: topSet,
    round2p5: round2p5,
    workingLoad: workingLoad,
    workingLoadStrict: workingLoadStrict,
    e1rm: e1rm,
    painFlag: painFlag,
    loadWord: loadWord,
    incrementLine: incrementLine,
    g1Step: g1Step,
    verdict: verdict,
    /* Rule W1 — W7. The bodyweight windows, the calorie decision, and the
       cooldown stamp WITH its clearer. Nothing here reads or writes storage:
       setCalChanged/clearCalChanged return a new state object and the caller
       persists it. */
    BW_WINDOW_MIN: BW_MIN,
    BW_HISTORY_DAYS: BW_HISTORY,
    CAL_COOLDOWN_DAYS: CAL_COOLDOWN,
    bwWindows: bwWindows,
    calorieAdvice: calorieAdvice,
    calCooldown: calCooldown,
    setCalChanged: setCalChanged,
    clearCalChanged: clearCalChanged,
    /* Rule ST1 — W9, and Rule C7b — W3. stallReport is the MEASUREMENT and
       travels to any plan unchanged; stallAdvice is the DIAGNOSIS and is gated
       on provenance, because "the split isn't the problem" was earned by a
       coach who assessed that split. KEY_LIFTS is compiled from the shipped
       plan; a caller on any other plan passes PHAT.planKeyLifts(plan). */
    ST1: { weeks: ST1_WEEKS, dates: ST1_DATES, reps: ST1_REPS, ratio: ST1_RATIO,
           recent: ST1_RECENT, priorFrom: ST1_PRIOR_FROM, priorTo: ST1_PRIOR_TO },
    KEY_LIFTS: KEY_LIFTS,
    e1rmByDate: e1rmByDate,
    stallReport: stallReport,
    stallAdvice: stallAdvice,
    /* Rule SP1 - W12. Speed load. Never cached; the pain flag does not
       touch it (addendum S2a). speedTooHeavy is advice and blocks nothing. */
    SPEED_SRC: SPEED_SRC,
    SP1: { mid: SP1_MID, bandLo: SP1_BAND_LO, bandHi: SP1_BAND_HI, cap: SP1_CAP,
           repLo: SP1_REP_LO, repHi: SP1_REP_HI, window: SP1_WINDOW, wide: SP1_WIDE },
    speedLoad: speedLoad,
    speedTooHeavy: speedTooHeavy,
    speedFlagText: speedFlagText,
    /* Rule S2 - landed with W14 because V1's gate needs it. Rule S1's
       painState (W4) is the per-exercise half: painWindow is the 7-day sweep
       that gates V1's offer, painState is "does the last time he did THIS
       exercise carry a note". One regex, painFlag, behind both — there is one
       definition of the word in this file and no second date window. */
    PAIN_DAYS: PAIN_DAYS,
    painWindow: painWindow,
    painState: painState,
    /* Rule R1 - W4. Rest is computed from the EXERCISE (k, hi) and from
       nothing else; `rest` is not a field on a day and must not become one.
       restText takes ELAPSED SECONDS so the caller owns an absolute timestamp
       — a tick count does not survive backgrounding, and the timer is never in
       the save path. */
    R1: { powerHi: R1_POWER_HI, hypHi: R1_HYP_HI },
    restTarget: restTarget,
    restText: restText,
    /* Rule V1 - W14. The volume tier. The setters return a new state; the
       caller persists it. Nothing here reads or writes storage, and nothing
       reads the stored includeCut key (Decision 6). */
    REINTRO_ORDER: REINTRO_ORDER,
    V1: { week: V1_WEEK, cooldown: V1_COOLDOWN },
    calendarWeeks: calendarWeeks,
    volumeTier: volumeTier,
    acceptReintro: acceptReintro,
    declineReintro: declineReintro,
    rollbackReintro: rollbackReintro,
    rollbackNotice: rollbackNotice,
    rollbackLine: rollbackLine,
    /* Rule D1 - W19. Recommended, never imposed. Nothing here starts a
       deload; deloadCheck only reads. */
    DELOAD: { days: DELOAD_DAYS, sets: DELOAD_SETS, short: DELOAD_SHORT,
              weeks: D1_WEEKS, backstop: D1_T3_WEEKS, run: D1_RUN },
    deloadCheck: deloadCheck,
    deloadStatus: deloadStatus,
    /* Rule E2 - the deload windows, exported because ST1 (W9) and E1 (W19)
       both read them and a test needs to see what was excluded and why. */
    deloadWindows: deloadWindows,
    deloadEx: deloadEx,
    startDeload: startDeload,
    declineDeload: declineDeload,
    endDeload: endDeload,
    cycleLine: cycleLine,
    migrateStore: migrateStore
  };
})();
