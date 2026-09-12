-- ============================================================================
-- PHAT Gym Track — Row Level Security (E-3).
--
-- APPLY schema.sql FIRST, THEN THIS FILE. Idempotent: safe to re-run.
--
-- WHY THIS FILE IS NOT OPTIONAL, stated once, plainly:
-- the anon key is compiled into the client and is published to the world the
-- moment index.html is deployed. That is by design and it is safe for exactly
-- one reason: every table is behind RLS scoped to auth.uid(). A table in this
-- database with RLS off is a public read-write table on the open internet.
-- There is no second line of defence. (CLAUDE.md §3.7, architecture.md rule 3.)
--
-- Single user. Chady only. The policies below are per-user rather than pinned
-- to one hard-coded uuid on purpose: a hard-coded uid cannot be written until
-- the account exists, would have to be edited into this file by hand, and
-- breaks silently on a re-created account. Restricting SIGN-UPS to one account
-- is an Auth setting, not a policy — see README §4. Do both.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Enable RLS on every table. No exceptions.
-- ----------------------------------------------------------------------------
alter table public.sessions   enable row level security;
alter table public.bodyweight enable row level security;
alter table public.user_state enable row level security;
alter table public.plans      enable row level security;
alter table public.conflicts  enable row level security;

-- NOT FORCED, deliberately: `force row level security` would also apply to the
-- table owner (postgres), which is the role the SQL editor and the dashboard
-- table browser run as — so verification and any future manual repair would
-- silently return zero rows and look like data loss. It would not add security
-- either: the elevated Supabase role bypasses RLS regardless of FORCE. If that
-- trade ever changes, it changes with a stated reason.


-- ----------------------------------------------------------------------------
-- 2. Policies. Four per data table: select / insert / update / delete, all
--    scoped to auth.uid() = user_id.
--
--    Note the pairing on update: USING decides which rows you may touch, WITH
--    CHECK decides what they may become. Both are required. USING alone lets a
--    row be updated to belong to someone else; WITH CHECK alone lets someone
--    else's row be read into the update in the first place.
--
--    `auth.uid()` is NULL for an anonymous request, and `user_id = NULL` is
--    NULL, which is not TRUE — so an anon SELECT matches no rows and returns
--    an empty set. Not an error. See §4.
-- ----------------------------------------------------------------------------

-- --- sessions ---------------------------------------------------------------
drop policy if exists sessions_select on public.sessions;
drop policy if exists sessions_insert on public.sessions;
drop policy if exists sessions_update on public.sessions;
drop policy if exists sessions_delete on public.sessions;

create policy sessions_select on public.sessions
  for select to authenticated
  using (auth.uid() = user_id);

create policy sessions_insert on public.sessions
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy sessions_update on public.sessions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy sessions_delete on public.sessions
  for delete to authenticated
  using (auth.uid() = user_id);

-- --- bodyweight -------------------------------------------------------------
drop policy if exists bodyweight_select on public.bodyweight;
drop policy if exists bodyweight_insert on public.bodyweight;
drop policy if exists bodyweight_update on public.bodyweight;
drop policy if exists bodyweight_delete on public.bodyweight;

create policy bodyweight_select on public.bodyweight
  for select to authenticated
  using (auth.uid() = user_id);

create policy bodyweight_insert on public.bodyweight
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy bodyweight_update on public.bodyweight
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy bodyweight_delete on public.bodyweight
  for delete to authenticated
  using (auth.uid() = user_id);

-- --- user_state -------------------------------------------------------------
drop policy if exists user_state_select on public.user_state;
drop policy if exists user_state_insert on public.user_state;
drop policy if exists user_state_update on public.user_state;
drop policy if exists user_state_delete on public.user_state;

create policy user_state_select on public.user_state
  for select to authenticated
  using (auth.uid() = user_id);

create policy user_state_insert on public.user_state
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy user_state_update on public.user_state
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy user_state_delete on public.user_state
  for delete to authenticated
  using (auth.uid() = user_id);

-- --- plans ------------------------------------------------------------------
drop policy if exists plans_select on public.plans;
drop policy if exists plans_insert on public.plans;
drop policy if exists plans_update on public.plans;
drop policy if exists plans_delete on public.plans;

create policy plans_select on public.plans
  for select to authenticated
  using (auth.uid() = user_id);

create policy plans_insert on public.plans
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy plans_update on public.plans
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy plans_delete on public.plans
  for delete to authenticated
  using (auth.uid() = user_id);

-- --- conflicts: SELECT and INSERT ONLY, and that is a decision --------------
-- This table is the archive of every document that was overwritten or deleted.
-- It is the only thing standing between a bad sync and a lost set. Giving the
-- client UPDATE or DELETE on it would let the same bug that destroyed the row
-- also destroy the evidence, which defeats the entire point of keeping it.
--
-- So: append-only from the app. Pruning it, if it is ever needed, is a
-- deliberate statement typed into the SQL editor by a human who has read what
-- they are about to throw away.
--
-- This is a DEVIATION from "four policies on every table" and it is flagged as
-- one. If Chady wants the app able to prune its own archive, uncomment the two
-- policies at the bottom of this block — but read the paragraph above first.
drop policy if exists conflicts_select on public.conflicts;
drop policy if exists conflicts_insert on public.conflicts;
drop policy if exists conflicts_update on public.conflicts;
drop policy if exists conflicts_delete on public.conflicts;

create policy conflicts_select on public.conflicts
  for select to authenticated
  using (auth.uid() = user_id);

create policy conflicts_insert on public.conflicts
  for insert to authenticated
  with check (auth.uid() = user_id);

-- create policy conflicts_update on public.conflicts
--   for update to authenticated
--   using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- create policy conflicts_delete on public.conflicts
--   for delete to authenticated
--   using (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 3. Grants.
--
-- `anon` KEEPS SELECT AND THAT IS DELIBERATE. The requirement is that an
-- anonymous query returns ZERO ROWS, not an error — an error tells an attacker
-- which tables exist and which do not, and "permission denied" versus "empty
-- result" is a shape leak. RLS does the work; the grant just lets the query run
-- far enough to return nothing.
--
-- `anon` LOSES insert/update/delete. RLS would already refuse them, but a
-- privilege refusal costs nothing, fails earlier, and means an accidentally
-- dropped INSERT policy is not instantly a public write endpoint. Belt and
-- braces on the write side; bare RLS on the read side, because the read side's
-- observable behaviour is part of the requirement.
-- ----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on public.sessions, public.bodyweight, public.user_state, public.plans
  to authenticated;
grant select, insert on public.conflicts to authenticated;

grant select on public.sessions, public.bodyweight, public.user_state,
                public.plans,    public.conflicts
  to anon;
revoke insert, update, delete
  on public.sessions, public.bodyweight, public.user_state, public.plans, public.conflicts
  from anon;

-- The view inherits nothing; grant it explicitly. It is a plain (security
-- invoker) view over public.sessions, so the caller's RLS on sessions still
-- applies through it — an anon select returns zero rows for the same reason.
grant select on public.v_session_counts to authenticated;
grant select on public.v_session_counts to anon;


-- ============================================================================
-- 4. THE PROOF lives in rls-selftest.sql, ON PURPOSE. It used to be the tail
-- of this file, and that cost a whole application: the Management API (and
-- any client that submits a file as one statement batch) runs the SUBMISSION
-- AS ONE TRANSACTION, so the self-test's trailing `rollback` rolled back the
-- policies above it as well - the file reported success and the database
-- had no policies. Nothing that can roll back may share a submission with
-- anything that must land. Run this file, THEN run rls-selftest.sql as a
-- separate submission, and read its results against README.md §2.
-- ============================================================================
