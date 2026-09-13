-- ============================================================================
-- PHAT Gym Track — RLS self-test (E-3). READ-ONLY. Changes nothing.
--
-- RUN THIS AS ITS OWN SUBMISSION, AFTER schema.sql AND rls.sql HAVE BEEN
-- APPLIED - never pasted onto the end of either. This block ends in a
-- `rollback`, and the Management API (and the SQL editor's "run" on a whole
-- file) executes a submission as ONE TRANSACTION: when this lived at the foot
-- of rls.sql, the rollback discarded the policies along with the test, the
-- submission reported success, and the database had no RLS policies at all.
-- That happened on 2026-09-11 and was caught by re-reading pg_policies, not
-- by anything the API said. Keep the proof and the policies in separate
-- files, always.
--
-- Expected results, in order:
--   A. five rows, rls_enabled = true on all five
--   B. 18 policies: 4 each on sessions, bodyweight, user_state, plans, and 2
--      on conflicts (select + insert only — see rls.sql for why).
--      Read the list, not the number; the number moves when a table is added.
--   B2. every view reports security_invoker = true
--   C. anon select on every table -> 0 rows, NO error
--   D. anon insert -> ERROR 42501, and the error text contains no row data
--   E. auth.uid() is null for anon
--   F. (schema 6, migrate-006-ld.sql) the session validator refuses a bad `ld`
--      unit with SQLSTATE 23514 and logic.js's exact sentence, refuses w/ld
--      disagreement at 60.86 and accepts it at 60.75 — one DO block, prints
--      `F: ok` or raises naming the first probe that disagreed
-- If any one of them fails, STOP and do not put the anon key into client code.
-- ============================================================================

-- --- A. RLS is actually on ---------------------------------------------------
select c.relname                as table_name,
       c.relrowsecurity         as rls_enabled,
       c.relforcerowsecurity    as rls_forced
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public'
  and  c.relkind = 'r'
order  by c.relname;
-- EVERY row must read rls_enabled = true. A table listed here with false is the
-- single worst outcome available in this project. Fix it before doing anything
-- else; do not deploy a client that carries the anon key until it is true.

-- --- B. the policies exist and are scoped -----------------------------------
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from   pg_policies
where  schemaname = 'public'
order  by tablename, cmd, policyname;
-- Every `qual` and `with_check` must mention auth.uid(). A policy with
-- qual = 'true' is RLS switched off wearing a costume.

-- --- B2. views do not leak around RLS ----------------------------------------
-- Check A only looks at TABLES (relkind = 'r'). A view is the classic way an
-- RLS'd table is handed out anyway: a view runs as its OWNER unless it is
-- created with security_invoker, and the owner here is postgres.
select c.relname as view_name,
       coalesce((select option_value from pg_options_to_table(c.reloptions)
                 where option_name = 'security_invoker'), 'false') as security_invoker
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public' and c.relkind = 'v'
order  by c.relname;
-- Every view must read security_invoker = true. One row today:
-- v_session_counts. A view listed here as false is a public copy of whatever
-- it selects from.

-- --- C/D/E. what the anon key can actually do -------------------------------
-- Run this whole block at once. It rolls back and changes nothing.
-- The Supabase SQL editor already runs a snippet inside a transaction, so the
-- explicit `begin` below may print "there is already a transaction in
-- progress". That warning is harmless — the `rollback` still discards
-- everything, including the role change.
begin;
  set local role anon;
  select set_config('request.jwt.claims',    '', true);
  select set_config('request.jwt.claim.sub', '', true);

  select auth.uid() as should_be_null;                       -- E: null

  select count(*) as sessions_visible   from public.sessions;    -- C: 0
  select count(*) as bodyweight_visible from public.bodyweight;  -- C: 0
  select count(*) as user_state_visible from public.user_state;  -- C: 0
  select count(*) as plans_visible      from public.plans;       -- C: 0
  select count(*) as conflicts_visible  from public.conflicts;   -- C: 0
rollback;

-- D. Run this one on its own. It MUST fail with SQLSTATE 42501
--    (insufficient_privilege). A success here means the database is open.
--
-- begin;
--   set local role anon;
--   select set_config('request.jwt.claims', '', true);
--   insert into public.sessions (doc)
--   values ('{"id":1,"date":"2026-09-11","dayId":"d1","entries":{}}'::jsonb);
-- rollback;

-- A second negative test worth running once, with a REAL signed-in session from
-- the browser console (not here): select a row while passing someone else's
-- user_id in the filter. It must return zero rows, not that row. RLS is applied
-- after the WHERE clause is parsed, not before — the filter cannot widen it.
-- Done from a real browser on 2026-09-11 (E-3 verification): a signed-in user
-- filtering on another user_id got 200 and [].

-- --- F. the ld validator (schema 6) — 23514 on a bad unit, the boundary ------
-- READ-ONLY: only the validator functions run; nothing is inserted. Run after
-- migrate-006-ld.sql (or a fresh schema.sql). Every sentence below is typed
-- from logic.js validateSessionDoc's message table and pinned in tests.html
-- S41 - the two sides must refuse with the SAME words. Expected output: one
-- notice, `F: ok (9 probes)`. Anything else is a mirror drift: fix the SQL to
-- match logic.js, never the other way round.
do $$
declare
  base    constant jsonb := '{"id":7,"date":"2026-09-13","dayId":"d2","planId":"phat","entries":{"d2a":{"sets":[],"note":"","rx":{"s":3,"lo":3,"hi":5,"k":"power"}}}}'::jsonb;
  probes  constant jsonb := '[
    {"set": {"w":60.8,"r":5,"ld":{"bar":20,"bu":"kg","add":90,"au":"kilo"}},  "expect": "phat: entry d2a set 1 ld.au must be kg or lb, got: kilo"},
    {"set": {"w":60.8,"r":5,"ld":{"bar":20,"bu":"kg","add":90}},              "expect": "phat: entry d2a set 1 ld.au must be kg or lb, got: (absent)"},
    {"set": {"w":60.8,"r":5,"ld":{"bar":20,"add":90,"au":"lb"}},              "expect": "phat: entry d2a set 1 ld.bar without ld.bu"},
    {"set": {"w":60.8,"r":5,"ld":{"bar":20,"bu":"kg","add":-5,"au":"lb"}},    "expect": "phat: entry d2a set 1 has an unreadable ld.add: \"-5\""},
    {"set": {"w":60.8,"r":5,"ld":{"bar":20,"bu":"kg","add":1101,"au":"lb"}},  "expect": "phat: entry d2a set 1 ld.add out of range (0..500 kg, 0..1100 lb): 1101"},
    {"set": {"w":60.8,"r":5,"ld":{"bar":0,"bu":"kg","add":90,"au":"lb"}},     "expect": "phat: entry d2a set 1 ld.bar out of range (above 0, up to 50 kg or 110 lb): 0"},
    {"set": {"w":60.86,"r":5,"ld":{"bar":20,"bu":"kg","add":90,"au":"lb"}},   "expect": "phat: entry d2a set 1 w 60.86 disagrees with ld (60.8)"},
    {"set": {"w":60.75,"r":5,"ld":{"bar":20,"bu":"kg","add":90,"au":"lb"}},   "expect": null},
    {"set": {"w":60.8,"r":5,"ld":{"bar":20,"bu":"kg","add":90,"au":"lb","plates":2}}, "expect": "phat: entry d2a set 1 ld has an unknown key: plates"}
  ]'::jsonb;
  pr      jsonb;
  doc     jsonb;
  got     text;
  n       int := 0;
begin
  for pr in select value from jsonb_array_elements(probes) loop
    n := n + 1;
    doc := jsonb_set(base, '{entries,d2a,sets}', jsonb_build_array(pr -> 'set'));
    got := null;
    begin
      perform public.phat_validate_session_doc(doc);
    exception when check_violation then
      got := sqlerrm;
    end;
    if jsonb_typeof(pr -> 'expect') = 'null' then
      if got is not null then
        raise exception 'F probe % should be ACCEPTED (60.75 is inside 0.05 of 60.8) but was refused: %', n, got;
      end if;
    elsif got is null then
      raise exception 'F probe % was ACCEPTED but must be refused with: %', n, pr ->> 'expect';
    elsif got <> (pr ->> 'expect') then
      raise exception 'F probe % refused with the wrong sentence. got: [%] expected: [%]', n, got, pr ->> 'expect';
    end if;
  end loop;
  raise notice 'F: ok (% probes)', n;
end $$;
-- A refusal here is the SAME 23514 the sync client is told to surface and not
-- retry; the probe asserts the SQLSTATE by catching check_violation and nothing
-- else, so a wrong error class fails the block rather than passing it.
