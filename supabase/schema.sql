-- ============================================================================
-- PHAT Gym Track — Supabase schema (E-3).
--
-- APPLY THIS FILE FIRST, THEN rls.sql. Both are idempotent: safe to re-run.
-- Nothing here requires the project URL or the anon key. See README.md.
--
-- This is a REMOTE store. It is sync and backup. localStorage remains the
-- source of truth during a workout (CLAUDE.md §3.2, architecture.md rule 2).
-- Nothing in this file may become a precondition for logging a set.
--
-- No client code is changed by this file. SCHEMA_VERSION in logic.js stays 5
-- and no stored local data is migrated.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. THE DESIGN DECISION: JSONB DOCUMENT PER SESSION, WITH DERIVED COLUMNS.
--
-- architecture.md sketched normalised sessions/entries/sets tables and said a
-- retreat to JSONB was cheap if it turned out to be over-engineering. It is.
-- Taking the retreat, deliberately, for five reasons — in order of weight:
--
--   1. ROUND-TRIP FIDELITY IS THE WHOLE JOB. This store exists so that a wiped
--      phone can be made whole. The only way to guarantee that is to give back
--      the bytes the device wrote. `buildSession()` produces a specific object
--      with a deliberate key order, and `logMeta` exists precisely so a write
--      "never drops a key it didn't understand". Shredding that object into
--      rows and reassembling it means the restored session is a RECONSTRUCTION,
--      and every future additive key (schema 4's `planId`, schema 5's `rx`) is
--      a column I would have had to know about in advance. The doc absorbs
--      them. This is the same additive discipline logic.js already runs on.
--
--   2. THE ENGINES READ WHOLE SESSIONS. `PHAT.verdict`, `stallReport`,
--      `lastFor`, `e1rmByDate`, `volumeTier` all take the sessions array and
--      compute in the client. There is no server-side query that a join would
--      enable and that the client does not already do locally, offline, in
--      milliseconds. Normalising buys a capability nothing asks for.
--
--   3. ENTRIES ARE A MAP, NOT A LIST. The stored shape is
--      `{exId: {sets:[{w,r}], note, rx?}}` — keyed by opaque exercise id
--      (B-46), which is exactly what a jsonb object is. A relational `entries`
--      table would have to re-impose a uniqueness constraint that the map gets
--      for free, and would lose insertion order, which `buildSession` keeps
--      deliberately so QA can assert on the serialized string.
--
--   4. THE VOLUME IS TINY. `demoStore` models ~30 sessions per six weeks: call
--      it 260 sessions, ~2,400 entries and ~7,000 sets a year, for ONE person.
--      A jsonb GIN index would be overkill; a join is solving a problem that
--      does not exist at this scale.
--
--   5. FEWER PLACES TO LIE. Three tables in a parent/child chain is three
--      chances for a partial write to leave a session with its sets missing —
--      the exact B-02 failure class, moved to the network. One row per session
--      is one atomic write. A session arrives whole or not at all.
--
-- WHAT IS NOT GIVEN UP: `client_id`, `local_date`, `day_id`, `plan_id` and
-- `date_basis` are real, indexed, typed columns. They are DERIVED FROM THE DOC
-- BY TRIGGER, never supplied separately, so they cannot drift from it. The
-- client cannot send a doc dated 2026-09-11 and a local_date of 2026-09-12.
--
-- If server-side set-level querying is ever genuinely needed, it is a view over
-- `jsonb_each` / `jsonb_array_elements`, added without touching a stored byte.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 1. Extensions — none needed.
--    gen_random_uuid() is core Postgres since 13; Supabase is well past that.
--    Deliberately NOT `create extension pgcrypto`: it would either be a no-op or
--    install a second copy into whichever schema happened to be first on the
--    search_path, and this file should not move anything it does not own.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 2. Validation. Reject loudly at the boundary; never silently drop a set.
--
-- These mirror logic.js EXACTLY and on purpose:
--   W_MIN 0, W_MAX 500      (0 kg is a legal set — a rack chin. B-21.)
--   R_MIN 1, R_MAX 100
--   NUM_W /^(?:\d+(?:\.\d*)?|\.\d+)$/     NUM_R /^\d+$/
--   DATE_RE /^\d{4}-\d{2}-\d{2}$/
--
-- Numeric STRINGS are accepted as well as numbers: sets are strings while
-- drafting and numbers once saved, and a schema-2 store imported by WO-002's
-- importer may still hold either. `isDoneSet` reads both, so this does too.
--
-- What it will NOT do is coerce. `"7.5.0"` is refused with a message naming the
-- session; it is never rounded, never NaN'd, never skipped. That is B-02's
-- failure class and it does not get to cross the network either.
--
-- Errors are raised with SQLSTATE 23514 (check_violation) so a future sync
-- layer can tell "this row is permanently unacceptable, stop retrying and tell
-- him" from a network error, which it must retry.
-- ----------------------------------------------------------------------------

create or replace function public.phat_reject(msg text)
returns void
language plpgsql
as $$
begin
  raise exception using errcode = '23514', message = 'phat: ' || msg;
end;
$$;

comment on function public.phat_reject(text) is
  'Raise a permanent, non-retryable rejection (SQLSTATE 23514). A sync client
   that sees 23514 must surface the message, not retry and not drop the row.';


create or replace function public.phat_validate_session_doc(doc jsonb)
returns void
language plpgsql
as $$
declare
  r_entry record;
  v_set   jsonb;
  v_w     jsonb;
  v_r     jsonb;
  t       text;
  n_w     numeric;
  n_r     numeric;
  d       date;
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

        for v_set in select value from jsonb_array_elements(r_entry.entry -> 'sets') loop
          if jsonb_typeof(v_set) <> 'object' then
            perform public.phat_reject('entry ' || r_entry.ex_id || ' has a set that is not an object');
          end if;

          v_w := v_set -> 'w';
          v_r := v_set -> 'r';
          if v_w is null or v_r is null then
            perform public.phat_reject('entry ' || r_entry.ex_id || ' has a set missing w or r');
          end if;

          -- weight
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
  'Mirrors logic.js validateDraft/buildSession bounds. Refuses; never coerces.';


create or replace function public.phat_validate_bw_doc(doc jsonb)
returns void
language plpgsql
as $$
declare
  n numeric;
  d date;
begin
  if doc is null or jsonb_typeof(doc) <> 'object' then
    perform public.phat_reject('bodyweight doc must be a JSON object');
  end if;

  if jsonb_typeof(doc -> 'date') <> 'string'
     or (doc ->> 'date') !~ '^\d{4}-\d{2}-\d{2}$' then
    perform public.phat_reject('bodyweight.date must be YYYY-MM-DD, got: ' || coalesce(doc ->> 'date', '(absent)'));
  end if;
  begin
    d := (doc ->> 'date')::date;
  exception when others then
    perform public.phat_reject('bodyweight.date is not a real calendar date: ' || (doc ->> 'date'));
  end;

  if jsonb_typeof(doc -> 'kg') = 'number' then
    n := (doc -> 'kg' #>> '{}')::numeric;
  elsif jsonb_typeof(doc -> 'kg') = 'string' and (doc ->> 'kg') ~ '^(\d+(\.\d*)?|\.\d+)$' then
    n := (doc ->> 'kg')::numeric;
  else
    perform public.phat_reject('bodyweight.kg must be a number or a numeric string');
  end if;

  -- Deliberately WIDER than the UI's 30..300 guard. Storage must never refuse a
  -- number the device already accepted and wrote to disk; a row that cannot be
  -- backed up is worse than a row that is implausible.
  if n < 20 or n > 400 then
    perform public.phat_reject('bodyweight.kg out of range (20..400): ' || n::text);
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- 3. The archive of losing versions.
--
-- architecture.md: "the losing version is KEPT, not discarded." This table is
-- how that is guaranteed BY CONSTRUCTION rather than by client discipline.
-- Triggers below copy the previous doc in here before any update overwrites it,
-- and copy the doc in here on any delete. Append-only: rls.sql grants insert
-- and select and deliberately grants no update or delete.
--
-- It is not a "conflicts to resolve" queue. It is a black box recorder. Nothing
-- reads it in normal operation; it exists so that the answer to "did that
-- overwrite cost me a set" is always yes-or-no and never a shrug.
-- ----------------------------------------------------------------------------

create table if not exists public.conflicts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind               text not null check (kind in ('session', 'bodyweight', 'user_state', 'plan')),
  natural_key        text not null,
  doc                jsonb not null,
  reason             text not null,
  client_updated_at  timestamptz,
  observed_at        timestamptz not null default now()
);

create index if not exists conflicts_user_kind_key_idx
  on public.conflicts (user_id, kind, natural_key, observed_at desc);

comment on table public.conflicts is
  'Append-only archive of every superseded or deleted document. Never pruned by
   the client. If this table is empty, nothing has ever been overwritten.';


-- ----------------------------------------------------------------------------
-- 4. Sessions.
-- ----------------------------------------------------------------------------

create table if not exists public.sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade default auth.uid(),

  -- THE IDEMPOTENCY KEY. Derived from doc->>'id', which is the device-minted
  -- session id (today: Date.now(), a number, from finish() in index.html).
  -- Unique per user, so pushing the same session twice UPDATES one row and can
  -- never create a second. This is the same guarantee B-03 makes locally for
  -- one bodyweight row per calendar date.
  client_id          text not null,

  -- Derived, never client-supplied. A LOCAL calendar date (CLAUDE.md §3.4).
  local_date         date not null,
  day_id             text not null,
  plan_id            text,          -- NULL means the shipped PHAT plan (planIdOf)
  date_basis         text check (date_basis in ('local', 'utc')),
                                    -- NULL is the on-disk meaning of "absent",
                                    -- i.e. written after WO-001 and therefore
                                    -- local. Do not default it to 'local': that
                                    -- would invent provenance the row lacks.

  -- The verbatim object buildSession() handed to save(). Nothing is stripped.
  doc                jsonb not null,

  -- Device clock, for a future last-write-wins comparison. See the gap noted in
  -- README §"Sync — a proposal, not a design": the local session object carries
  -- no updatedAt today, so this defaults to the server clock at first push and
  -- is NOT yet a trustworthy LWW input.
  client_updated_at  timestamptz not null default now(),

  -- Soft delete only. A row is never removed by the app; B-05 will bring edit
  -- and delete, and a delete that syncs must be reversible.
  deleted_at         timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint sessions_user_client_key unique (user_id, client_id)
);

create index if not exists sessions_user_date_idx    on public.sessions (user_id, local_date);
create index if not exists sessions_user_updated_idx on public.sessions (user_id, updated_at desc);
create index if not exists sessions_user_live_idx    on public.sessions (user_id, local_date) where deleted_at is null;

comment on column public.sessions.client_id is
  'doc->>''id''. Unique per user: this is what makes a re-push idempotent.';
comment on column public.sessions.doc is
  'The session exactly as the device wrote it. Restore hands this straight back.';


-- ----------------------------------------------------------------------------
-- 5. Bodyweight. One row per user per LOCAL calendar date — the same invariant
--    B-03 enforces on the phone, expressed as a primary key so no amount of
--    re-sync can produce two rows for one day.
-- ----------------------------------------------------------------------------

create table if not exists public.bodyweight (
  user_id            uuid not null references auth.users(id) on delete cascade default auth.uid(),
  local_date         date not null,
  kg                 numeric(5,2) not null check (kg between 20 and 400),
  date_basis         text check (date_basis in ('local', 'utc')),
  doc                jsonb not null,
  client_updated_at  timestamptz not null default now(),
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (user_id, local_date)
);

create index if not exists bodyweight_user_updated_idx on public.bodyweight (user_id, updated_at desc);


-- ----------------------------------------------------------------------------
-- 6. User state — the store-level metadata that is NOT a session.
--
-- `log_meta` is logPayload() minus `sessions`: schemaVersion, includeCut,
-- reintro, lastReintroDate, calChangedAt, deload, utcDatedBefore, and any key a
-- future build adds. It is stored whole for the same reason S.logMeta exists in
-- index.html: a write must never drop a key it did not understand.
--
-- The five named fields are exposed as GENERATED columns so they are queryable
-- without being a second, drifting copy — they cannot disagree with log_meta,
-- because Postgres computes them from it.
--
-- `plan_meta` is the phat:v1:plans store minus its `plans` array, i.e.
-- {schemaVersion, activePlanId}. The plan documents themselves are rows in
-- public.plans.
-- ----------------------------------------------------------------------------

create table if not exists public.user_state (
  user_id             uuid primary key references auth.users(id) on delete cascade default auth.uid(),

  log_meta            jsonb not null default '{}'::jsonb,
  plan_meta           jsonb not null default '{}'::jsonb,

  include_cut         boolean generated always as ((log_meta ->> 'includeCut')::boolean) stored,
  reintro             jsonb   generated always as (log_meta -> 'reintro') stored,
  last_reintro_date   jsonb   generated always as (log_meta -> 'lastReintroDate') stored,
  cal_changed_at      text    generated always as (log_meta ->> 'calChangedAt') stored,
  deload              jsonb   generated always as (log_meta -> 'deload') stored,
  utc_dated_before    text    generated always as (log_meta ->> 'utcDatedBefore') stored,
  log_schema_version  int     generated always as ((log_meta ->> 'schemaVersion')::int) stored,
  active_plan_id      text    generated always as (plan_meta ->> 'activePlanId') stored,

  client_updated_at   timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint user_state_log_meta_is_object  check (jsonb_typeof(log_meta)  = 'object'),
  constraint user_state_plan_meta_is_object check (jsonb_typeof(plan_meta) = 'object'),
  -- The log store's sessions array belongs in public.sessions and nowhere else.
  -- Two copies of the history is how history forks.
  constraint user_state_no_sessions         check (not (log_meta ? 'sessions'))
);

comment on column public.user_state.cal_changed_at is
  'Text, not date, on purpose: text->date is not immutable, so it cannot be a
   generated column. It is already YYYY-MM-DD on disk.';


-- ----------------------------------------------------------------------------
-- 7. Plans (E-5 / phat:v1:plans).
--
-- The shipped PHAT plan is CODE, not data — logic.js never writes it to
-- storage, so it never appears here. This table holds user-created plans only
-- and will be EMPTY until the Plan Editor (WO-004 W15) ships. It exists now
-- because sessions carry planId and a restore that brings back a session whose
-- plan is missing is a session whose prescriptions cannot be read.
-- ----------------------------------------------------------------------------

create table if not exists public.plans (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade default auth.uid(),
  plan_id            text not null,          -- doc->>'planId'
  doc                jsonb not null,
  client_updated_at  timestamptz not null default now(),
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint plans_user_plan_key unique (user_id, plan_id)
);


-- ----------------------------------------------------------------------------
-- 8. Triggers.
--
--   a) derive  — validate the doc, then fill every promoted column FROM it.
--                The client sends {doc, client_updated_at}; it cannot send a
--                column that disagrees with the document.
--   b) archive — before any doc-changing update, and on any delete, copy the
--                previous document into public.conflicts.
--
-- The archive triggers run SECURITY INVOKER (the default). No elevated
-- privilege is needed: any row the caller was allowed to change is a row whose
-- user_id already equals auth.uid(), so the insert satisfies conflicts' own
-- RLS policy. Nothing here can be used to write a row for another user.
-- ----------------------------------------------------------------------------

create or replace function public.phat_sessions_derive()
returns trigger
language plpgsql
as $$
begin
  perform public.phat_validate_session_doc(new.doc);

  new.user_id    := coalesce(new.user_id, auth.uid());
  if new.user_id is null then
    perform public.phat_reject('no authenticated user; a session cannot be stored without one');
  end if;

  new.client_id  := new.doc ->> 'id';
  new.local_date := (new.doc ->> 'date')::date;
  new.day_id     := btrim(new.doc ->> 'dayId');
  new.plan_id    := nullif(btrim(coalesce(new.doc ->> 'planId', '')), '');
  new.date_basis := nullif(btrim(coalesce(new.doc ->> 'dateBasis', '')), '');
  if new.date_basis is not null and new.date_basis not in ('local', 'utc') then
    perform public.phat_reject('session.dateBasis must be "local" or "utc", got: ' || new.date_basis);
  end if;

  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create or replace function public.phat_bodyweight_derive()
returns trigger
language plpgsql
as $$
begin
  perform public.phat_validate_bw_doc(new.doc);

  new.user_id    := coalesce(new.user_id, auth.uid());
  if new.user_id is null then
    perform public.phat_reject('no authenticated user; a bodyweight row cannot be stored without one');
  end if;

  new.local_date := (new.doc ->> 'date')::date;
  new.kg         := (new.doc -> 'kg' #>> '{}')::numeric;
  new.date_basis := nullif(btrim(coalesce(new.doc ->> 'dateBasis', '')), '');
  if new.date_basis is not null and new.date_basis not in ('local', 'utc') then
    perform public.phat_reject('bodyweight.dateBasis must be "local" or "utc", got: ' || new.date_basis);
  end if;

  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create or replace function public.phat_plans_derive()
returns trigger
language plpgsql
as $$
begin
  if new.doc is null or jsonb_typeof(new.doc) <> 'object' then
    perform public.phat_reject('plan doc must be a JSON object');
  end if;
  if jsonb_typeof(new.doc -> 'planId') <> 'string' or btrim(new.doc ->> 'planId') = '' then
    perform public.phat_reject('plan.planId is required and must be a non-empty string');
  end if;
  if new.doc ? 'days' and jsonb_typeof(new.doc -> 'days') <> 'array' then
    perform public.phat_reject('plan.days must be an array');
  end if;

  new.user_id := coalesce(new.user_id, auth.uid());
  if new.user_id is null then
    perform public.phat_reject('no authenticated user; a plan cannot be stored without one');
  end if;
  new.plan_id    := btrim(new.doc ->> 'planId');
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create or replace function public.phat_user_state_touch()
returns trigger
language plpgsql
as $$
begin
  new.user_id    := coalesce(new.user_id, auth.uid());
  if new.user_id is null then
    perform public.phat_reject('no authenticated user; user_state cannot be stored without one');
  end if;
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.created_at := old.created_at; end if;
  return new;
end;
$$;

-- --- the archivers -----------------------------------------------------------

create or replace function public.phat_archive_session()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if old.doc is distinct from new.doc then
      insert into public.conflicts (user_id, kind, natural_key, doc, reason, client_updated_at)
      values (old.user_id, 'session', old.client_id, old.doc, 'superseded_by_update', old.client_updated_at);
    end if;
    return new;
  end if;
  -- Account deletion cascades here with the auth.users row already gone.
  -- conflicts.user_id references auth.users, so archiving would fail its own
  -- FK and block the cascade - an account could never be deleted. When the
  -- user no longer exists there is nothing to keep evidence for.
  if not exists (select 1 from auth.users u where u.id = old.user_id) then
    return old;
  end if;
  insert into public.conflicts (user_id, kind, natural_key, doc, reason, client_updated_at)
  values (old.user_id, 'session', old.client_id, old.doc, 'row_deleted', old.client_updated_at);
  return old;
end;
$$;

create or replace function public.phat_archive_bodyweight()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if old.doc is distinct from new.doc then
      insert into public.conflicts (user_id, kind, natural_key, doc, reason, client_updated_at)
      values (old.user_id, 'bodyweight', old.local_date::text, old.doc, 'superseded_by_update', old.client_updated_at);
    end if;
    return new;
  end if;
  -- Account deletion cascades here with the auth.users row already gone.
  -- conflicts.user_id references auth.users, so archiving would fail its own
  -- FK and block the cascade - an account could never be deleted. When the
  -- user no longer exists there is nothing to keep evidence for.
  if not exists (select 1 from auth.users u where u.id = old.user_id) then
    return old;
  end if;
  insert into public.conflicts (user_id, kind, natural_key, doc, reason, client_updated_at)
  values (old.user_id, 'bodyweight', old.local_date::text, old.doc, 'row_deleted', old.client_updated_at);
  return old;
end;
$$;

create or replace function public.phat_archive_user_state()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if old.log_meta is distinct from new.log_meta or old.plan_meta is distinct from new.plan_meta then
      insert into public.conflicts (user_id, kind, natural_key, doc, reason, client_updated_at)
      values (old.user_id, 'user_state', 'user_state',
              jsonb_build_object('log_meta', old.log_meta, 'plan_meta', old.plan_meta),
              'superseded_by_update', old.client_updated_at);
    end if;
    return new;
  end if;
  -- Account deletion cascades here with the auth.users row already gone.
  -- conflicts.user_id references auth.users, so archiving would fail its own
  -- FK and block the cascade - an account could never be deleted. When the
  -- user no longer exists there is nothing to keep evidence for.
  if not exists (select 1 from auth.users u where u.id = old.user_id) then
    return old;
  end if;
  insert into public.conflicts (user_id, kind, natural_key, doc, reason, client_updated_at)
  values (old.user_id, 'user_state', 'user_state',
          jsonb_build_object('log_meta', old.log_meta, 'plan_meta', old.plan_meta),
          'row_deleted', old.client_updated_at);
  return old;
end;
$$;

create or replace function public.phat_archive_plan()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if old.doc is distinct from new.doc then
      insert into public.conflicts (user_id, kind, natural_key, doc, reason, client_updated_at)
      values (old.user_id, 'plan', old.plan_id, old.doc, 'superseded_by_update', old.client_updated_at);
    end if;
    return new;
  end if;
  -- Account deletion cascades here with the auth.users row already gone.
  -- conflicts.user_id references auth.users, so archiving would fail its own
  -- FK and block the cascade - an account could never be deleted. When the
  -- user no longer exists there is nothing to keep evidence for.
  if not exists (select 1 from auth.users u where u.id = old.user_id) then
    return old;
  end if;
  insert into public.conflicts (user_id, kind, natural_key, doc, reason, client_updated_at)
  values (old.user_id, 'plan', old.plan_id, old.doc, 'row_deleted', old.client_updated_at);
  return old;
end;
$$;

-- --- wiring (drop/create so the file is re-runnable) -------------------------

drop trigger if exists sessions_derive    on public.sessions;
drop trigger if exists sessions_archive   on public.sessions;
drop trigger if exists bodyweight_derive  on public.bodyweight;
drop trigger if exists bodyweight_archive on public.bodyweight;
drop trigger if exists user_state_touch   on public.user_state;
drop trigger if exists user_state_archive on public.user_state;
drop trigger if exists plans_derive       on public.plans;
drop trigger if exists plans_archive      on public.plans;

create trigger sessions_derive
  before insert or update on public.sessions
  for each row execute function public.phat_sessions_derive();

create trigger sessions_archive
  after update or delete on public.sessions
  for each row execute function public.phat_archive_session();

create trigger bodyweight_derive
  before insert or update on public.bodyweight
  for each row execute function public.phat_bodyweight_derive();

create trigger bodyweight_archive
  after update or delete on public.bodyweight
  for each row execute function public.phat_archive_bodyweight();

create trigger user_state_touch
  before insert or update on public.user_state
  for each row execute function public.phat_user_state_touch();

create trigger user_state_archive
  after update or delete on public.user_state
  for each row execute function public.phat_archive_user_state();

create trigger plans_derive
  before insert or update on public.plans
  for each row execute function public.phat_plans_derive();

create trigger plans_archive
  after update or delete on public.plans
  for each row execute function public.phat_archive_plan();


-- ----------------------------------------------------------------------------
-- 9. Read helpers.
--
-- A view, not a materialised copy: it computes from the docs, so it cannot
-- disagree with them. `v_session_counts` is the integrity check a sync layer
-- should run after a push — "the row that came back holds the same number of
-- completed sets as the one I sent".
-- ----------------------------------------------------------------------------

-- security_invoker IS LOAD-BEARING, NOT DECORATION. A Postgres view runs as its
-- OWNER by default, and the owner here is postgres — so without this option the
-- view would read public.sessions with RLS bypassed and hand every row to any
-- caller holding the anon key. A view is the classic way an RLS'd table leaks.
drop view if exists public.v_session_counts;
create view public.v_session_counts with (security_invoker = true) as
select
  s.user_id,
  s.client_id,
  s.local_date,
  s.day_id,
  s.deleted_at,
  (select count(*) from jsonb_each(coalesce(s.doc -> 'entries', '{}'::jsonb)))                          as entry_count,
  (select coalesce(sum(jsonb_array_length(coalesce(e.value -> 'sets', '[]'::jsonb))), 0)
     from jsonb_each(coalesce(s.doc -> 'entries', '{}'::jsonb)) e)                                      as set_count
from public.sessions s;

comment on view public.v_session_counts is
  'Set and entry counts computed from the stored document. Use after a push to
   prove nothing was dropped in transit.';


-- ----------------------------------------------------------------------------
-- 10. What is deliberately NOT here.
--
--   phat:v1:draft  — the in-progress session. NOT synced. Its durability is
--                    local and already solved (B-01). Syncing a live draft
--                    creates the worst conflict there is: two devices editing
--                    one unfinished workout, mid-set, over a flaky connection.
--                    Needs a ruling from Chady before anything is built.
--
--   phat:v1:prefs  — restAuto, onboarded, proteinDate. Device preferences, not
--                    his sweat. Syncing restAuto would let a laptop change how
--                    a phone behaves mid-workout, for zero durability gain.
--                    proteinDate is the only one with any claim to being data
--                    and it is explicitly read by no engine. Also needs a
--                    ruling, and is cheap to add later if the answer is yes.
--
--   The shipped PHAT plan — it is code. Writing it here would let a stored copy
--                    go stale against logic.js.
-- ----------------------------------------------------------------------------

-- APPLY rls.sql NEXT. Until you do, these tables have NO row-level security and
-- the anon key is a public database.
