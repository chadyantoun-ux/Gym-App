-- ============================================================================
-- PHAT Gym Track — migration 006: `ld` on a set (WO-010 W5). FUNCTION
-- REPLACEMENT ONLY. No table changes, no column, no row touched, no policy.
--
-- Apply this file ON ITS OWN in the SQL editor, after schema.sql and rls.sql
-- are already in place. It can be re-run; every statement is create-or-replace.
-- The same change is folded into schema.sql for a fresh install, so applying
-- schema.sql again after this is a no-op for these functions.
--
-- WHAT IT DOES. Schema 6 (logic.js V_LD) lets a set carry the components its
-- kg total was built from:
--
--     {"w": 60.8, "r": 5, "ld": {"bar": 20, "bu": "kg", "add": 90, "au": "lb"}}
--
-- `add` and `au` required; `bar` and `bu` both present or both absent; no other
-- key; units "kg" | "lb"; `add` in 0..500 kg / 0..1100 lb; `bar` in
-- (0, 50 kg] / (0, 110 lb]; and `w` must equal the composed total within
-- 0.05 kg. A set WITHOUT `ld` is a kg-direct set and is unchanged.
--
-- The validator below is the mirror of logic.js `ldDocProblems` /
-- `validateSessionDoc`, sentence for sentence, so a document the app refuses
-- to push is refused here with the SAME words, and one the app accepts lands.
-- The numbers are copied from PHAT.LIMITS (W_MIN/W_MAX, ADD_MAX, BAR_MAX,
-- LD_TOL, LB_KG); change one there and this file moves with it.
--
--   entry {ex} set {n} ld must be an object
--   entry {ex} set {n} ld has an unknown key: {k}
--   entry {ex} set {n} ld.au must be kg or lb, got: {v}
--   entry {ex} set {n} ld.bu must be kg or lb, got: {v}
--   entry {ex} set {n} ld.bar without ld.bu
--   entry {ex} set {n} ld.bu without ld.bar
--   entry {ex} set {n} has an unreadable ld.add: "{v}"
--   entry {ex} set {n} ld.add out of range (0..500 kg, 0..1100 lb): {v}
--   entry {ex} set {n} has an unreadable ld.bar: "{v}"
--   entry {ex} set {n} ld.bar out of range (above 0, up to 50 kg or 110 lb): {v}
--   entry {ex} set {n} w {w} disagrees with ld ({kg})
--
-- logic.js collects EVERY problem; this raises on the FIRST, in the same
-- order, so a document with one fault gets the identical sentence on both
-- sides. Refuses; never coerces, never rounds `w` to fit, never drops the set.
-- SQLSTATE 23514 like every other phat rejection.
--
-- THE BOUNDARY, pinned in tests.html S41 and to be probed here: 20 kg bar +
-- 90 lb composes to 60.8; w 60.75 and 60.85 are ACCEPTED (|d| = 0.05, the
-- +1e-9 makes the edge inclusive), 60.86 and 60.74 are REFUSED. Numeric
-- arithmetic here is exact where JS's is floating; the +1e-9 slack is what
-- keeps the two from disagreeing at exactly 0.05.
-- ============================================================================

-- A numeric printed the way JavaScript's String(n) prints it: no trailing
-- zeros after the point, no dangling point. 100.0 -> 100, 60.80 -> 60.8.
create or replace function public.phat_num_text(n numeric)
returns text
language sql
immutable
as $$
  select case when position('.' in n::text) > 0
              then rtrim(rtrim(n::text, '0'), '.')
              else n::text end;
$$;

comment on function public.phat_num_text(numeric) is
  'numeric -> text as JS String() would print it (no trailing zeros). Used so a
   refusal sentence quotes the same figure logic.js quotes.';


-- The value of a JSON scalar as logic.js str() would render it for a sentence:
-- absent / null -> "", string -> itself, number -> its text, boolean -> true/
-- false, object -> [object Object], array -> elements joined by commas.
create or replace function public.phat_json_str(v jsonb)
returns text
language sql
immutable
as $$
  select case
    when v is null or jsonb_typeof(v) = 'null' then ''
    when jsonb_typeof(v) = 'object' then '[object Object]'
    when jsonb_typeof(v) = 'array' then
      coalesce((select string_agg(x.e #>> '{}', ',') from jsonb_array_elements(v) as x(e)), '')
    else v #>> '{}'
  end;
$$;


-- One set's `ld`, validated against the table above. `who` is the sentence
-- prefix ("entry d1a set 2 "), `w_text` the typed total as stored, `n_w` the
-- typed total as a number (null when the weight itself was unreadable — then
-- the disagreement test is skipped, exactly as validateSessionDoc skips it).
create or replace function public.phat_validate_ld(ld jsonb, who text, w_text text, n_w numeric)
returns void
language plpgsql
as $$
declare
  k       text;
  au      jsonb;
  bu      jsonb;
  t_add   text;
  t_bar   text;
  n_add   numeric;
  n_bar   numeric;
  has_bar boolean;
  has_bu  boolean;
  kg_bar  numeric := 0;
  kg_tot  numeric;
  lb_kg   constant numeric := 0.45359237;   -- PHAT.LIMITS.lbKg, exactly
  tol     constant numeric := 0.05;         -- PHAT.LIMITS.ldTol
begin
  if ld is null or jsonb_typeof(ld) <> 'object' then
    perform public.phat_reject(who || 'ld must be an object');
  end if;

  -- 1. no key outside {bar, bu, add, au}. JSONB iterates keys in its own
  --    storage order (length, then bytes); with one stray key that is the key.
  for k in select jsonb_object_keys(ld) loop
    if k not in ('bar', 'bu', 'add', 'au') then
      perform public.phat_reject(who || 'ld has an unknown key: ' || k);
    end if;
  end loop;

  -- 2. au
  au := ld -> 'au';
  if au is null or jsonb_typeof(au) <> 'string' or (au #>> '{}') not in ('kg', 'lb') then
    perform public.phat_reject(who || 'ld.au must be kg or lb, got: '
      || case when au is null then '(absent)' else public.phat_json_str(au) end);
  end if;

  -- 3. add: NUM_W's text rule on its trimmed text (never coerced), then its
  --    own range in its own unit.
  t_add := btrim(public.phat_json_str(ld -> 'add'), E' \t\n\r');
  if t_add !~ '^(\d+(\.\d*)?|\.\d+)$' then
    perform public.phat_reject(who || 'has an unreadable ld.add: "' || public.phat_json_str(ld -> 'add') || '"');
  end if;
  n_add := t_add::numeric;
  if n_add < 0 or n_add > (case when (au #>> '{}') = 'kg' then 500 else 1100 end) then
    perform public.phat_reject(who || 'ld.add out of range (0..500 kg, 0..1100 lb): ' || public.phat_json_str(ld -> 'add'));
  end if;

  -- 4. bar / bu: both or neither
  has_bar := ld ? 'bar';
  has_bu  := ld ? 'bu';
  if has_bar and not has_bu then
    perform public.phat_reject(who || 'ld.bar without ld.bu');
  end if;
  if has_bu and not has_bar then
    perform public.phat_reject(who || 'ld.bu without ld.bar');
  end if;
  if has_bu then
    bu := ld -> 'bu';
    if jsonb_typeof(bu) <> 'string' or (bu #>> '{}') not in ('kg', 'lb') then
      perform public.phat_reject(who || 'ld.bu must be kg or lb, got: ' || public.phat_json_str(bu));
    end if;
  end if;
  if has_bar then
    t_bar := btrim(public.phat_json_str(ld -> 'bar'), E' \t\n\r');
    if t_bar !~ '^(\d+(\.\d*)?|\.\d+)$' then
      perform public.phat_reject(who || 'has an unreadable ld.bar: "' || public.phat_json_str(ld -> 'bar') || '"');
    end if;
    n_bar := t_bar::numeric;
    if n_bar <= 0 or n_bar > (case when (bu #>> '{}') = 'kg' then 50 else 110 end) then
      perform public.phat_reject(who || 'ld.bar out of range (above 0, up to 50 kg or 110 lb): ' || public.phat_json_str(ld -> 'bar'));
    end if;
    kg_bar := case when (bu #>> '{}') = 'kg' then n_bar else n_bar * lb_kg end;
  end if;

  -- 5. compose — rounded ONCE, at the total, to 0.1 kg (composeLoad) — and
  --    compare with the typed w. A disagreement is a refusal, never a rewrite.
  kg_tot := round(kg_bar + (case when (au #>> '{}') = 'kg' then n_add else n_add * lb_kg end), 1);
  if n_w is not null and abs(n_w - kg_tot) > tol + 0.000000001 then
    perform public.phat_reject(who || 'w ' || w_text || ' disagrees with ld (' || public.phat_num_text(kg_tot) || ')');
  end if;
end;
$$;

comment on function public.phat_validate_ld(jsonb, text, text, numeric) is
  'Mirrors logic.js ldDocProblems + the w/ld disagreement test in
   validateSessionDoc, same sentences, first fault raised (23514).';


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
   validateSessionDoc''s ld rules (phat_validate_ld). Refuses; never coerces.';

-- ----------------------------------------------------------------------------
-- After applying: run the ld probes in rls-selftest.sql (section F). They must
-- return the exact sentences listed there, every one as SQLSTATE 23514, and
-- the good documents must pass with no error.
-- ----------------------------------------------------------------------------
