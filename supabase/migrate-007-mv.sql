-- ============================================================================
-- PHAT Gym Track — migration 007: `mv`, `sw` and `n` on an entry (WO-014 W4).
-- FUNCTION REPLACEMENT ONLY. No table changes, no column, no row touched, no
-- policy, no data rewritten. Not one stored document moves.
--
-- APPLY THIS FILE ON ITS OWN, as its own submission, and BEFORE the client
-- deploy. Two reasons, both learned here:
--   * The Management API runs a submission as ONE TRANSACTION. A trailing
--     `rollback` in a file that shared a submission once discarded every RLS
--     policy in this project (supabase/rls-selftest.sql's lesson). So this
--     file contains no selftest, no rollback and no probe — the probes live
--     in rls-selftest.sql and are run separately, after.
--   * A client that writes `mv` must never meet a validator that refuses it.
--     The order is: apply this, probe it, THEN deploy logic.js. Reversed, the
--     first session he saves after a swap is refused on push — logged safely
--     on the phone (offline-first: the local write already succeeded) but not
--     backed up, and the failure would surface as a sync error he did not
--     cause. WO-014 §5 orders it explicitly; this comment is the second copy.
--
-- It can be re-run; every statement is create-or-replace. It REPLACES the
-- whole of phat_validate_session_doc as migrate-006-ld.sql left it — a
-- create-or-replace is wholesale, so the schema-6 `ld` rules are carried
-- through this file verbatim and are not lost by applying it. Diff it against
-- migrate-006-ld.sql: the only change is the block marked "schema 7".
-- phat_reject, phat_num_text, phat_json_str and phat_validate_ld are NOT
-- redefined here; migrate-006-ld.sql already created them and this file
-- depends on them being in place.
--
-- WHAT IT DOES. Schema 7 (logic.js V_MV) lets a logged ENTRY carry three
-- additive keys beside `sets`, `note` and `rx`:
--
--   {"sets":[…], "note":"", "mv":"mv_Machine_Row", "sw":1, "n":"Machine row"}
--
--   mv  the movement he ACTUALLY performed. A movement id: `mv_<upstreamId>`
--       at the pinned library SHA a859101d633a01c4a1a920d6a8ce41dabba0705f,
--       or an id minted from the plan namespace. Format only, never an
--       existence check — a movement a later SHA drops must still load.
--       ABSENT MEANS "the slot's movement", which is exactly what every
--       session logged before schema 7 was, including his four.
--   sw  1, and only 1, when the movement differed from the slot's at log
--       time — the `Swapped` mark. Absent means not swapped.
--   n   a display name, for a movement no plan carries. At most 120
--       characters after trimming. Absent means the slot's name.
--
-- A session WITHOUT any of the three is unchanged and validates exactly as it
-- did under 006. THE ENTRY KEY SET IS NOT OTHERWISE CONSTRAINED and must not
-- become so: this validator has never enumerated an entry's keys, the client
-- adds keys additively by design, and a server that refused an unknown key
-- would refuse tomorrow's schema before it shipped.
--
-- The messages below are the mirror of logic.js `validateSessionDoc`,
-- sentence for sentence, so a document the app refuses to push is refused
-- here with the SAME words and one the app accepts lands. logic.js collects
-- EVERY problem; this raises on the FIRST, in the same order.
-- SQLSTATE 23514 like every other phat rejection.
--
--   entry {ex} mv must be a movement id, got: {v}
--   entry {ex} sw must be 1 when present, got: {v}
--   entry {ex} n must be a string, got: {v}
--   entry {ex} n is longer than 120 characters
--
-- {v} is phat_json_str, which renders a value the way JavaScript's str()
-- renders it for a sentence: a number as its text, an object as
-- [object Object], null as the empty string. The mv regex and the 96-character
-- bound are PHAT.MV_RE and MV_MAX; the 120 is PHAT.ENTRY_NAME_MAX. Change one
-- in logic.js and this file moves with it, or a set the app saved is refused
-- on push.
--
-- THE BOUNDARY, to probe after applying: an entry with no mv/sw/n passes
-- unchanged; mv "mv_Machine_Row" passes; mv "mv bad" is refused; mv 5 is
-- refused with `got: 5`; sw 1 passes, sw 2 and sw true are refused; n "" is
-- ACCEPTED (it claims nothing); n of 121 characters is refused.
-- ============================================================================

create or replace function public.phat_validate_session_doc(doc jsonb)
returns void
language plpgsql
as $$
declare
  r_entry record;
  r_set   record;
  v_set   jsonb;
  v_w     jsonb;
  v_r     jsonb;
  t       text;
  n_w     numeric;
  n_r     numeric;
  d       date;
  who     text;
begin
  if doc is null or jsonb_typeof(doc) <> 'object' then
    perform public.phat_reject('session doc must be a JSON object');
  end if;

  -- id: the device-generated session id. It is the idempotency key, so it is
  -- the one field whose absence is unrecoverable.
  if jsonb_typeof(doc -> 'id') not in ('number', 'string')
     or coalesce(doc ->> 'id', '') = '' then
    perform public.phat_reject('session.id is required and must be a number or a non-empty string');
  end if;

  -- dayId: 'd1'..'d5'. Not enumerated here on purpose — the plan document owns
  -- the day ids (B-47: storage ids do not move), and a hard-coded list in
  -- Postgres would be a second, drifting copy of the programme.
  if jsonb_typeof(doc -> 'dayId') <> 'string' or btrim(doc ->> 'dayId') = '' then
    perform public.phat_reject('session.dayId is required and must be a non-empty string');
  end if;

  -- date: a LOCAL calendar date, YYYY-MM-DD, never a coerced UTC timestamp.
  if jsonb_typeof(doc -> 'date') <> 'string'
     or (doc ->> 'date') !~ '^\d{4}-\d{2}-\d{2}$' then
    perform public.phat_reject('session.date must be YYYY-MM-DD, got: ' || coalesce(doc ->> 'date', '(absent)'));
  end if;
  begin
    d := (doc ->> 'date')::date;
  exception when others then
    perform public.phat_reject('session.date is not a real calendar date: ' || (doc ->> 'date'));
  end;

  if doc ? 'planId' and (jsonb_typeof(doc -> 'planId') <> 'string' or btrim(doc ->> 'planId') = '') then
    perform public.phat_reject('session.planId, when present, must be a non-empty string');
  end if;

  if doc ? 'entries' then
    if jsonb_typeof(doc -> 'entries') <> 'object' then
      perform public.phat_reject('session.entries must be an object keyed by exercise id');
    end if;

    for r_entry in select key as ex_id, value as entry from jsonb_each(doc -> 'entries') loop
      if jsonb_typeof(r_entry.entry) <> 'object' then
        perform public.phat_reject('entry ' || r_entry.ex_id || ' must be an object');
      end if;

      -- ---- schema 7 (WO-014 W4): the movement keys, on the ENTRY ----
      -- Checked BEFORE the sets, which is where validateSessionDoc checks
      -- them, so a document with one fault gets the identical FIRST sentence
      -- on both sides. All three are optional and an absent one is a MEANING,
      -- never a hole: no mv = the slot's movement (true of every session
      -- logged before schema 7), no sw = not swapped, no n = the slot's name.
      -- Refuses; never coerces, never drops the key, never drops the entry.
      if r_entry.entry ? 'mv' then
        if jsonb_typeof(r_entry.entry -> 'mv') <> 'string'
           or (r_entry.entry ->> 'mv') !~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'
           or length(r_entry.entry ->> 'mv') > 96 then
          perform public.phat_reject('entry ' || r_entry.ex_id || ' mv must be a movement id, got: '
            || public.phat_json_str(r_entry.entry -> 'mv'));
        end if;
      end if;

      -- `sw` is 1 or it is absent. Not true, not "1", not 0 - exactly the test
      -- logic.js entryMetaProblems applies, and the same test `cut` gets on a
      -- plan slot: a marker with two spellings is a marker two readers
      -- disagree about.
      if r_entry.entry ? 'sw' then
        if jsonb_typeof(r_entry.entry -> 'sw') <> 'number'
           or (r_entry.entry ->> 'sw')::numeric <> 1 then
          perform public.phat_reject('entry ' || r_entry.ex_id || ' sw must be 1 when present, got: '
            || public.phat_json_str(r_entry.entry -> 'sw'));
        end if;
      end if;

      -- `n`: a string, at most 120 characters after trimming. An empty one is
      -- no name and is not a fault - logic.js trims it away rather than
      -- storing it, so the server never sees one from this app, and refusing
      -- it would only refuse a hand-edited document that claims nothing.
      if r_entry.entry ? 'n' then
        if jsonb_typeof(r_entry.entry -> 'n') <> 'string' then
          perform public.phat_reject('entry ' || r_entry.ex_id || ' n must be a string, got: '
            || public.phat_json_str(r_entry.entry -> 'n'));
        elsif length(btrim(r_entry.entry ->> 'n')) > 120 then
          perform public.phat_reject('entry ' || r_entry.ex_id || ' n is longer than 120 characters');
        end if;
      end if;

      -- A notes-only entry is legal and is KEPT (B-33). `sets` may be an empty
      -- array. It may not be a non-array.
      if r_entry.entry ? 'sets' then
        if jsonb_typeof(r_entry.entry -> 'sets') <> 'array' then
          perform public.phat_reject('entry ' || r_entry.ex_id || '.sets must be an array');
        end if;

        for r_set in select value, ordinality from jsonb_array_elements(r_entry.entry -> 'sets') with ordinality loop
          v_set := r_set.value;
          if jsonb_typeof(v_set) <> 'object' then
            perform public.phat_reject('entry ' || r_entry.ex_id || ' has a set that is not an object');
          end if;

          v_w := v_set -> 'w';
          v_r := v_set -> 'r';
          if v_w is null or v_r is null or jsonb_typeof(v_w) = 'null' or jsonb_typeof(v_r) = 'null' then
            perform public.phat_reject('entry ' || r_entry.ex_id || ' has a set missing w or r');
          end if;

          -- weight
          n_w := null;
          if jsonb_typeof(v_w) = 'number' then
            n_w := (v_w #>> '{}')::numeric;
          elsif jsonb_typeof(v_w) = 'string' then
            t := v_w #>> '{}';
            if t !~ '^(\d+(\.\d*)?|\.\d+)$' then
              perform public.phat_reject('entry ' || r_entry.ex_id || ' has an unreadable weight: "' || t || '"');
            end if;
            n_w := t::numeric;
          else
            perform public.phat_reject('entry ' || r_entry.ex_id || ' has a weight that is neither a number nor a numeric string');
          end if;
          if n_w < 0 or n_w > 500 then
            perform public.phat_reject('entry ' || r_entry.ex_id || ' weight out of range (0..500): ' || n_w::text);
          end if;

          -- the load's components (WO-010 §1, schema 6) — between weight and
          -- reps, which is where validateSessionDoc reads them, so the FIRST
          -- fault named is the same on both sides. Absent means kg-direct.
          if v_set ? 'ld' then
            who := 'entry ' || r_entry.ex_id || ' set ' || r_set.ordinality::text || ' ';
            perform public.phat_validate_ld(v_set -> 'ld', who, v_w #>> '{}', n_w);
          end if;

          -- reps
          if jsonb_typeof(v_r) = 'number' then
            n_r := (v_r #>> '{}')::numeric;
            if n_r <> trunc(n_r) then
              perform public.phat_reject('entry ' || r_entry.ex_id || ' reps must be a whole number: ' || n_r::text);
            end if;
          elsif jsonb_typeof(v_r) = 'string' then
            t := v_r #>> '{}';
            if t !~ '^\d+$' then
              perform public.phat_reject('entry ' || r_entry.ex_id || ' has unreadable reps: "' || t || '"');
            end if;
            n_r := t::numeric;
          else
            perform public.phat_reject('entry ' || r_entry.ex_id || ' has reps that are neither a number nor a numeric string');
          end if;
          if n_r < 1 or n_r > 100 then
            perform public.phat_reject('entry ' || r_entry.ex_id || ' reps out of range (1..100): ' || n_r::text);
          end if;
        end loop;
      end if;
    end loop;
  end if;
end;
$$;

comment on function public.phat_validate_session_doc(jsonb) is
  'Mirrors logic.js validateDraft/buildSession bounds and, from schema 6,
   validateSessionDoc''s ld rules (phat_validate_ld) and, from schema 7,
   an entry''s mv / sw / n. Refuses; never coerces, never drops a key.';


-- ----------------------------------------------------------------------------
-- After applying, as a SEPARATE submission: probe the four sentences above and
-- confirm a schema-6 document (no mv, no sw, no n) still lands untouched. His
-- four sessions carry none of the three and must validate byte for byte as
-- they did before this file was applied — that is the check that matters, and
-- it is checked, not assumed (WO-014 W7).
-- ----------------------------------------------------------------------------
