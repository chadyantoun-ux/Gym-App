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

    /* 3 — no comparable previous entry. */
    if (!Cprev || Cprev.length < s) {
      return mk("", "First time logged. This becomes your baseline.", "", "H1.3");
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
    var ex = ctx.ex;
    if (!isObj(ex)) return null;
    var s = ex.s;
    if (typeof s !== "number" || !isFinite(s) || s < 1) return null;

    var C = completedSets(ctx.sets);
    if (C.length < s) return null;                 /* B-24 — the gate */
    C = C.slice(0, s);

    if (ex.k === "speed") {
      /* Unchanged from the old verdictFor, and deliberately untested: Rule SP1
         (W12) replaces this whole branch with a computed load. */
      return mk("", "Submaximal and fast. Do not grind these.", "", "SP0");
    }

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

  /* stallReport(sessions, todayStr, keyLifts) -> {stalled, untested, testable}

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
     ids as a fourth argument and W10 renders the extra line. */
  function stallReport(sessions, todayStr, keyLifts) {
    var today = safeToday(todayStr);
    var out = { stalled: [], untested: [], testable: false };

    out.testable = trainingWeeks(sessions, today) >= ST1_WEEKS;
    if (!out.testable) return out;
    if (!Array.isArray(keyLifts)) return out;

    var rFrom = dateAdd(today, -ST1_RECENT);
    var pFrom = dateAdd(today, -ST1_PRIOR_FROM);
    var pTo = dateAdd(today, -ST1_PRIOR_TO);
    if (rFrom === null || pFrom === null || pTo === null) return out;

    for (var i = 0; i < keyLifts.length; i++) {
      var l = keyLifts[i];
      if (!isObj(l)) continue;
      var id = str(l.id).trim();
      if (id === "") continue;
      var name = (typeof l.n === "string" && l.n.trim() !== "") ? l.n : id;

      var R = e1rmByDate(sessions, id, rFrom, today);
      var P = e1rmByDate(sessions, id, pFrom, pTo);
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

  var SPEED_SRC = { d3a: "d1a", d4a: "d2a", d5a: "d1d" };
  var SP1_MID = 0.675;       /* the printed target                        */
  var SP1_BAND_LO = 0.65;
  var SP1_BAND_HI = 0.70;
  var SP1_CAP = 0.75;        /* above this it is not speed work           */
  var SP1_REP_LO = 3, SP1_REP_HI = 5;
  var SP1_WINDOW = 28;       /* [today-28 .. today]                       */
  var SP1_WIDE = 56;
  var SP1_INSTRUCTION = "If a rep slows down, the set is over. Cut the weight, not the sets.";

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

  /* speedLoad(sessions, exId, todayStr, srcName)
       -> { exId, srcId, target, lo, hi, source:{w,r,date}|null, srcWindow,
            reason, text, instruction }

     `target` is null whenever there is no number to print, and `reason` says
     why: "unknown" (not a speed slot), "no-source" (nothing in 56 days).
     `srcName` is the source exercise's CURRENT name from PROGRAM - the
     fallback copy interpolates it (WO-003 Decision 5), so B-28's rename
     reaches this string without touching this file. Omit it and the fallback
     names the id, which is visibly wrong rather than quietly stale.

     `srcWindow` is 28 or 56 - which window produced R - or null. The card does
     not have to say, but a test does, and so does anyone reading a number
     that came from seven weeks ago.

     Never throws, never mutates, never caches. */
  function speedLoad(sessions, exId, todayStr, srcName) {
    var id = str(exId).trim();
    var out = {
      exId: id, srcId: null, target: null, lo: null, hi: null,
      source: null, srcWindow: null, reason: null, text: "",
      instruction: SP1_INSTRUCTION
    };
    if (!own(SPEED_SRC, id)) {
      out.reason = "unknown";
      return out;
    }
    out.srcId = SPEED_SRC[id];
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

  /* Per-day reintroduction order (audit section 5). Rule data from the coach,
     not programme data - which is why it lives here as ids and why the NAMES
     come from the caller's PROGRAM. Note d4 and d5 are NOT in programme
     order; that is the coach's ordering and it ships as written. */
  var REINTRO_ORDER = {
    d1: ["d1c"],
    d2: ["d2c"],
    d3: ["d3d", "d3g"],
    d4: ["d4g", "d4c"],
    d5: ["d5d", "d5j", "d5g"]
  };
  var V1_WEEK = 5;           /* trainingWeeks before any offer            */
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

  /* The day's reintroduction order, reconciled with the day it is applied to.
     Ids the coach listed that this build's PROGRAM does not mark cut:1 are
     dropped; cut:1 ids the coach did not list are APPENDED in programme order.
     Neither should ever happen - but the failure mode of the alternative is an
     accessory that can never be reintroduced, or a counter that points past
     the end of the list, and neither is worth a throw. */
  function orderFor(dayId, exList) {
    var cuts = cutIdsOf(exList);
    var id = str(dayId).trim();
    var listed = own(REINTRO_ORDER, id) ? REINTRO_ORDER[id] : [];
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

  /* The programme-state lines, in one place, because two functions print them
     and the copy may not drift between them (audit section 5, section 8, UX
     spec 1.2/1.3). Returns every candidate; the callers choose by precedence.
       row         the "where am I" line for this week
       status      the accessory count line, weeks 5+
       divergence  calendar week vs training week, when they differ
       explain     the one sentence that answers the divergence */
  function tierLines(tw, cw, back, cuts, hasSessions, dl) {
    var out = { row: "", status: "", divergence: "", explain: "" };
    if (isObj(dl) && dl.active) {
      out.row = dl.text;
      return out;
    }
    if (!hasSessions) return out;

    if (cw !== tw && tw > 0) {
      out.divergence = "Week " + cw + " by the calendar, week " + tw + " of real training." +
                       (tw < V1_WEEK ? " Reduced volume holds." : "");
      out.explain = "A training week is a week with three or more logged sessions.";
    }

    if (back >= cuts && cuts > 0 && tw >= V1_WEEK) {
      out.status = "Full volume. All " + cuts + " accessories are in.";
    } else if (tw >= V1_WEEK) {
      out.status = "Week " + tw + " · " + back + " of " + cuts + " accessories back in.";
    }

    if (tw === 0) {
      out.row = "Reduced volume until you have logged four weeks of three or more sessions.";
    } else if (tw <= 4) {
      out.row = "Week " + tw + " of 4 at reduced volume. The cut exercises come back from week 5.";
    } else if (tw === V1_WEEK) {
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

     Fails OPEN, never throws (UX spec 1.7): garbage in gives the base
     exercises, no offer and empty lines. A partial day is never returned and a
     populated card is never hidden. */
  function volumeTier(ctx) {
    var c = isObj(ctx) ? ctx : {};
    var today = safeToday(c.todayStr);
    var sessions = Array.isArray(c.sessions) ? c.sessions : [];
    var program = Array.isArray(c.program) ? c.program : null;
    var dayId = str(c.dayId).trim();
    var day = findDay(program, dayId);
    var exList = Array.isArray(c.exercises) ? c.exercises
               : (day && Array.isArray(day.ex) ? day.ex : []);
    var state = isObj(c.state) ? c.state : {};
    var dl = deloadStatus((c.deload !== undefined) ? { deload: c.deload } : state, today);

    var tw = trainingWeeks(sessions, today);
    var cw = calendarWeeks(sessions, today);
    var tot = accessoryTotals(program, state);
    var lines = tierLines(tw, cw, tot.back, tot.cuts, sessions.length > 0, dl);

    var order = orderFor(dayId, exList);
    /* Weeks 1-4: zero, and there is no override anywhere in the app.
       During a deload: zero, accessories are out (audit section 8). The
       counter is NOT decremented for a deload here - rollbackReintro is the
       only thing that moves it, and only on a stall or a trigger. */
    var n = (tw >= V1_WEEK && !dl.active) ? Math.min(counterOf(state, dayId), order.length) : 0;

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

    var out = {
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
      tierLine: lines.divergence !== "" ? lines.divergence : (tw <= 4 ? lines.row : ""),
      tierNote: lines.explain,
      deload: { active: dl.active, day: dl.day }
    };

    /* ---- the offer gate (audit section 5, addendum S2b) ---- */
    var stalled = (isObj(c.stallReport) && Array.isArray(c.stallReport.stalled))
      ? c.stallReport.stalled : [];
    var stamp = stampOf(state, dayId);
    var gap = stamp === null ? null : dayGap(stamp, today);

    if (dl.active) out.blocked = "deload";
    else if (dayId === "" || !order.length) out.blocked = "none";
    else if (tw < V1_WEEK) out.blocked = "week";
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
  function rollbackReintro(state, program, todayStr, sessions) {
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
      order = orderFor(id, days[i].ex);
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
  var D1_TAIL = "Take a deload week: same weights, 2 sets, stop 2 reps short. Resume where you left off.";
  var D1_ACTIVE_TAIL = "Same weights, 2 sets, 2 reps short. Do not chase numbers this week.";
  var D1_ENDED = "Deload done. Back to full sets at your last working loads.";
  var D1_DECLINED = "Noted. Asked again after the next session.";

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

  /* T1's evidence, one row per DISTINCT DATE, ascending (addendum 6c).

     A date is evidence only when an entry on it holds at least `s` completed
     sets: workingLoadStrict's rule, because a load read off a session he
     abandoned after one set is a confident wrong number with no tell (B-24).
     Half-finished dates are SKIPPED, not counted as failures - the app does
     not read a short session as weakness.

     Two saves on one date are ONE row. A correction saved beside its original
     must not read as two consecutive failures, so a date counts as completed
     if ANY entry on it completed the prescription, and as a failure only when
     every evaluable entry on it failed. */
  function d1Rows(sessions, exId, s, lo, todayStr, sinceStr) {
    var out = [];
    if (!Array.isArray(sessions)) return out;
    var today = safeToday(todayStr);
    var by = {}, i, j, ses, d, e, C, load, full, rec;
    for (i = 0; i < sessions.length; i++) {
      ses = sessions[i];
      d = sessionDate(ses);
      if (d === "" || d > today) continue;
      if (sinceStr !== null && d <= sinceStr) continue;
      if (!isObj(ses) || !isObj(ses.entries) || !own(ses.entries, exId)) continue;
      e = ses.entries[exId];
      if (!isObj(e) || !Array.isArray(e.sets)) continue;
      C = completedSets(e.sets);
      if (C.length < s) continue;                /* not evaluable evidence */
      C = C.slice(0, s);
      load = C[0].w; full = true;
      for (j = 0; j < C.length; j++) {
        if (C[j].w < load) load = C[j].w;
        if (C[j].r < lo) full = false;
      }
      if (!own(by, d)) by[d] = { date: d, full: false, fullLoad: null, failLoad: null };
      rec = by[d];
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

  /* T1: two consecutive failing DATES on one key lift, at a load he has
     already completed for the full prescription. The load clause is what
     keeps normal progression out of it: failing 3 sets at a new heavier
     weight is a Tuesday, not a deload. */
  function d1T1(sessions, lift, todayStr, sinceStr) {
    if (!isObj(lift)) return null;
    var id = str(lift.id).trim();
    var s = lift.s, lo = lift.lo;
    if (id === "") return null;
    if (typeof s !== "number" || !isFinite(s) || s < 1) return null;
    if (typeof lo !== "number" || !isFinite(lo) || lo < 1) return null;
    var rows = d1Rows(sessions, id, Math.floor(s), lo, todayStr, sinceStr);
    var best = null, run = 0, at = null, i, r;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (r.full) {
        run = 0;
      } else if (best !== null && r.failLoad !== null && r.failLoad <= best + 1e-9) {
        run++; at = r.date;
        if (run >= D1_RUN) return { date: at };
      } else {
        run = 0;
      }
      if (r.full && (best === null || r.fullLoad > best)) best = r.fullLoad;
    }
    return null;
  }

  /* deloadCheck(ctx) -> {trigger:"T1"|"T2"|"T3"|null, text, x2, lifts,
                          rollback, reason}

     ctx = { sessions, todayStr, stallReport, keyLifts, state, deload }

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
     "active", "declined", or null for "no trigger". Never throws; a thrown
     banner is a spurious recommendation and those cost trust (UX spec 2.6). */
  function deloadCheck(ctx) {
    var c = isObj(ctx) ? ctx : {};
    var out = { trigger: null, text: "", x2: "", lifts: [], rollback: false, reason: null };
    var sessions = Array.isArray(c.sessions) ? c.sessions : [];
    var today = safeToday(c.todayStr);
    var state = isObj(c.state) ? c.state : {};
    var dl = deloadStatus((c.deload !== undefined) ? { deload: c.deload } : state, today);

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
    var lifts = Array.isArray(c.keyLifts) ? c.keyLifts : [];
    var i, l, name;

    /* T1 - the most specific trigger, so it is checked first. */
    for (i = 0; i < lifts.length; i++) {
      l = lifts[i];
      if (!isObj(l)) continue;
      if (d1T1(sessions, l, today, since) === null) continue;
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
    if (stalled.length >= 2 && t2Fresh) {
      out.trigger = "T2";
      out.lifts = stalled.slice(0);
      out.rollback = true;
      out.text = andList(stalled) + " have " + (stalled.length === 2 ? "both" : "all") +
                 " stalled. " + D1_TAIL;
      return out;
    }

    /* T3 - the calendar backstop, in TRAINING weeks. */
    if (weeksSince(sessions, today, since) >= D1_T3_WEEKS) {
      out.trigger = "T3";
      out.text = "Nine weeks straight. Take a deload week before something makes you.";
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
     weights, 2 sets, stop 2 reps short of hi. Speed work is returned
     unchanged - it is already submaximal and low-fatigue - and cut:1
     accessories are dropped by volumeTier, not here.

     `hi` is only pulled in on POWER slots, which is the only place the audit
     names a rep change. Never below `lo`.

     THE VERDICT GATE. verdict(ctx) gates on ex.s, so the caller must pass the
     SAME exercise object to the card and to the verdict: the deloaded one.
     Gating on 3 while prescribing 2 withholds his verdict for the whole week.
     Sets he logs beyond the prescription still render and still save - the
     deload changes what he is asked for, never what he did. */
  function deloadEx(ex, active) {
    if (!isObj(ex) || active !== true || ex.k === "speed") return ex;
    var out = copyObj(ex);
    if (typeof ex.s === "number" && isFinite(ex.s) && ex.s > DELOAD_SETS) out.s = DELOAD_SETS;
    if (ex.k === "power" && typeof ex.hi === "number" && isFinite(ex.hi) &&
        typeof ex.lo === "number" && isFinite(ex.lo)) {
      out.hi = Math.max(ex.lo, ex.hi - DELOAD_SHORT);
    }
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
    var dl = deloadStatus((c.deload !== undefined) ? { deload: c.deload } : state, today);
    var tw = trainingWeeks(sessions, today);
    var cw = calendarWeeks(sessions, today);
    var tot = program ? accessoryTotals(program, state) : {
      back: (typeof c.back === "number" && isFinite(c.back)) ? c.back : 0,
      cuts: (typeof c.cuts === "number" && isFinite(c.cuts)) ? c.cuts : 0
    };
    var lines = tierLines(tw, cw, tot.back, tot.cuts, sessions.length > 0, dl);
    return {
      text: lines.row,
      row: lines.row,
      divergence: lines.divergence,
      explain: lines.explain,
      trainingWeeks: tw,
      calendarWeeks: cw,
      back: tot.back,
      cuts: tot.cuts,
      deload: { active: dl.active, day: dl.day, last: dl.last, ended: dl.ended }
    };
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
    /* Rule ST1 — W9. */
    ST1: { weeks: ST1_WEEKS, dates: ST1_DATES, reps: ST1_REPS, ratio: ST1_RATIO,
           recent: ST1_RECENT, priorFrom: ST1_PRIOR_FROM, priorTo: ST1_PRIOR_TO },
    e1rmByDate: e1rmByDate,
    stallReport: stallReport,
    /* Rule SP1 - W12. Speed load. Never cached; the pain flag does not
       touch it (addendum S2a). speedTooHeavy is advice and blocks nothing. */
    SPEED_SRC: SPEED_SRC,
    SP1: { mid: SP1_MID, bandLo: SP1_BAND_LO, bandHi: SP1_BAND_HI, cap: SP1_CAP,
           repLo: SP1_REP_LO, repHi: SP1_REP_HI, window: SP1_WINDOW, wide: SP1_WIDE },
    speedLoad: speedLoad,
    speedTooHeavy: speedTooHeavy,
    speedFlagText: speedFlagText,
    /* Rule S2 - landed with W14 because V1's gate needs it. W16 owns the rest
       of S1/S2 and should call this rather than write a second window. */
    PAIN_DAYS: PAIN_DAYS,
    painWindow: painWindow,
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
    deloadEx: deloadEx,
    startDeload: startDeload,
    declineDeload: declineDeload,
    endDeload: endDeload,
    cycleLine: cycleLine,
    migrateStore: migrateStore
  };
})();
