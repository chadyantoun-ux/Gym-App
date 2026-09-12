# Supabase — E-3

Backend store for Phat Gym Track. **Backup and restore only.** `localStorage` is the source of truth
during a workout and nothing in here may ever sit between tapping `+` and the number changing on
screen (CLAUDE.md §3.2).

**Current state (2026-09-11): applied, verified, and wired.** Project
`https://nkebsoqjtkcdiswrmely.supabase.co`; the publishable key is in `sync.js` and that is where it
belongs (§3). Schema and RLS are applied — five tables, 18 policies, RLS on everywhere, the
publishable key returns zero rows on every table, an anonymous insert fails with `42501`, and
`v_session_counts` is `security_invoker`. The client is `sync.js` (an ES module, loaded after boot)
plus `PHAT.backupPayload` / `PHAT.restorePayload` in `logic.js`, and the Settings screen carries the
one Backup section. What was decided and why is in §6 and `docs/decisions.md`.

---

## 0. How the client works

| Piece | Where | What it does |
|---|---|---|
| `backupPayload(log, bw, plans)` | `logic.js`, pure | Turns the three stores into the rows to upsert. Validates every document against the same rules as the server; a document that would be refused is **left out and named** in `problems`, never coerced, never dropped quietly |
| `restorePayload(rows)` | `logic.js`, pure | Rebuilds the three stores from pulled rows. **Refuses whole** on one bad document and names it. Restores the builder's key order (JSONB sorts keys) so a restored session is byte-identical to the one the device wrote |
| `validateSessionDoc` / `validateBwDoc` | `logic.js`, pure | Mirror `phat_validate_session_doc` / `phat_validate_bw_doc` line for line |
| `backupSig(payload)` | `logic.js`, pure | Key-order-independent signature; equal to the one stored at the last successful push means nothing has changed |
| `sync.js` | ES module, `window.PHAT_SYNC` | `createClient` on the pinned CDN build, `signIn` / `signUp` / `signOut`, `push(payload)` (upserts, chunked), `pull()` (every live row). No store key is named in this file |
| `loadSync` / `backupSoon` / `runBackup` / `restoreStart` / `restoreApply` | `index.html` | The app side. `save()` schedules a push **after** its write has returned; a 2 s debounce coalesces bursts; a manual `BACK UP NOW` ignores the signature |

**Triggers for a push:** a successful write to `phat:v1:log`, `phat:v1:bw` or `phat:v1:plans`
(inside `save()`, after the write); `BACK UP NOW`; once on open when signed in and online (skipped
when the signature matches the last successful push); the `online` event. Never a keystroke, never
the draft.

**Module loading is deliberately not a `<script type="module">` in the markup.** `loadSync()`
injects the tag after the first render, only on `http(s)` and only when `navigator.onLine` is not
`false`. The tag's `error` event covers the module and the CDN import inside it, so no signal means
a clean "Backup needs a connection" state and zero console errors; `file://` never attempts it. The
CDN URL is pinned to `@supabase/supabase-js@2.116.0` and is **not** precached by `sw.js`
(cross-origin, opaque) — `sync.js` itself is.

**Auth** is email + password from Settings; the session persists in `localStorage` under
`phat:auth` (not a `phat:v1:*` key). Sign-out clears that key only. Magic links are rejected: a link
from an email opens in the browser, not the installed PWA.

**Restore** is the dangerous path. Onto an empty log: one confirmation. Onto a non-empty log: the
word `REPLACE` typed (WO-004 C-14), the local log **exported first**, and a verbatim copy kept under
`phat:v1:recover:log:<ts>` / `phat:v1:recover:bw:<ts>` — if that copy cannot be written, nothing is
replaced. Refused while an unfinished session is on disk. Every write goes through `save()`.

---

## 1. Apply, in this order

1. Open the Supabase dashboard → **SQL Editor** → **New query**.
2. Paste the whole of **`schema.sql`**. Run. Expect `Success. No rows returned.`
3. New query. Paste the whole of **`rls.sql`**. Run.
4. New query. Paste **`rls-selftest.sql`** and check each result against §2 below.

**Why the self-test is its own file, and why this matters more than it looks:** the Management API
(and any client that submits a file as one batch) **runs a submission as one transaction**. When the
self-test lived at the foot of `rls.sql`, its trailing `rollback` rolled back the policies above it —
the submission reported success and the database had **no RLS policies**. Caught on 2026-09-11 by
re-reading `pg_policies`, not by anything the API said. Nothing that can roll back may share a
submission with anything that must land.

All three files are idempotent — re-running them is safe and is the intended way to make a change:
edit the file, re-run the file, commit the file. There is no migration tool and there does not need
to be one for a single-user database with one table set.

**Order matters, and re-running `schema.sql` means re-running `rls.sql` too.** `rls.sql` alters
tables `schema.sql` creates, and `schema.sql` drops and recreates `v_session_counts`, which discards
that view's grants. Always run the pair, then the self-test.

Re-running is **non-destructive to data**: every table is `create table if not exists`, no column is
dropped, and no row is touched. Nothing in any file deletes anything.
---

## 2. Verify RLS is actually on

A table in this database with RLS **off** is the single worst outcome available, because the anon
key is published in client code the moment the app deploys. Without RLS that key is a public
read-write database. This check is not a formality.

**Check A — the switch.**

```sql
select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
```

Five rows: `bodyweight`, `conflicts`, `plans`, `sessions`, `user_state`. **`relrowsecurity` must be
`true` on every one.** A `false` anywhere, or a sixth table you did not expect, stops everything.

**Check B — the policies.** `select * from pg_policies where schemaname = 'public';` — 18 rows.
Every `qual` and `with_check` must contain `auth.uid()`. A policy whose `qual` is `true` is RLS
switched off wearing a costume; it will pass Check A and protect nothing.

**Check B2 — views.** Check A only looks at tables. A view runs as its *owner* unless it is created
`with (security_invoker = true)`, so a view over an RLS'd table is the classic way the table gets
handed out anyway. The query in `rls-selftest.sql` B2 must report `security_invoker = true` for every view
— there is one, `v_session_counts`.

**Check C — behaviour, which is the only check that actually proves anything.** The C/D/E block in
`rls-selftest.sql` impersonates `anon`, counts every table, and rolls back. Every count must be
**`0`**, and it must be zero *rows*, not an error. An error would tell an unauthenticated caller
which tables exist; a grant of `select` to `anon` is kept deliberately so that RLS — not a
permission failure — is what returns nothing.

**Check D — writes.** The commented insert in `rls-selftest.sql` D must fail with **SQLSTATE `42501`**.
If it succeeds, stop and do not deploy.

Re-run Check A after any future change to this schema. Adding a table and forgetting
`enable row level security` is the realistic way this goes wrong, and it goes wrong silently.

---

## 3. Keys — where each one may live

| Key | May live in | Never in |
|---|---|---|
| **Project URL** | client code, committed to git, printed in the browser | — |
| **anon / publishable key** | client code, committed to git | — *(safe only because of RLS — it is not a secret, it is an identifier)* |
| **`service_role` key** | **nowhere in this project** | not in SQL, not in a comment, not in `index.html`, not in a commit, not in a prompt, not in an example, not in a `.env` that gets committed |

The anon key is designed to be public. It gets you as far as "you are nobody", and RLS answers
"nobody sees nothing". That is the whole security model and it is why §2 is not optional.

The `service_role` key bypasses RLS entirely. This project has **no server**, no API route and no
build step, so there is no component that could legitimately use it and therefore no legitimate
place to put it. If a Vercel serverless function is ever added, it goes in Vercel's environment
variables and only there (CLAUDE.md §3.7). `.gitignore` already excludes `.env` and `.env.*`.

Practical rule: if you are ever about to paste a key that is longer than the anon key, or one the
dashboard hid behind a **Reveal** button, stop.

**Rotate the anon key** if it is ever published *before* §2 passes — during that window it really was
a public database.

---

## 4. One more thing to do in the dashboard

RLS scopes rows to `auth.uid()`. It does **not** stop a stranger creating their *own* account in
this project and writing their own rows. For a single-user app that is free storage for someone
else and a support surface for you.

**Authentication → Providers → Email → disable "Enable sign ups"** *after* creating Chady's one
account. Create the account first or you will lock yourself out. The `CREATE ACCOUNT` button in
Settings will then say `New accounts are switched off.` — that is the intended end state.

Also: do not enable anonymous sign-ins. Email confirmation is currently **off**
(`mailer_autoconfirm`) so that sign-up from the Settings screen returns a session directly; the
client reports an account created without a session rather than treating it as signed in, so
turning confirmation back on later degrades honestly.

**A throwaway account exists:** `test+e3@example.com`, created by the E-3 verification run, with
three test sessions and one bodyweight row under it (and one `conflicts` row from a deliberate
hard delete during the derived-column test). Delete the user in Authentication → Users once Chady's
account exists; `on delete cascade` removes every row it owns.

---

## 5. What the tables are

| Table | Holds | Local equivalent | Idempotency key |
|---|---|---|---|
| `sessions` | one row per logged session, the document verbatim | `phat:v1:log` → `sessions[]` | `(user_id, client_id)` where `client_id = doc.id` |
| `bodyweight` | one row per user per local calendar date | `phat:v1:bw` → `entries[]` | `(user_id, local_date)` — the primary key |
| `user_state` | `includeCut`, `reintro`, `lastReintroDate`, `calChangedAt`, `deload`, `utcDatedBefore`, `schemaVersion`, and any key a future build adds | `phat:v1:log` minus `sessions` | `user_id` — one row |
| `plans` | user-created plan documents (empty until the Plan Editor ships) | `phat:v1:plans` → `plans[]` | `(user_id, plan_id)` |
| `conflicts` | every document that was ever overwritten or deleted | — | append-only |

Not stored, deliberately: **`phat:v1:draft`** (the live workout — syncing it is the worst conflict
case there is) and **`phat:v1:prefs`** (`restAuto`, `onboarded`, `proteinDate` — device preferences,
not his sweat). Both need a ruling before anything is built; see §8.

### Why one JSONB document per session and not `entries` / `sets` tables

The reasoning is written out at length at the top of `schema.sql`. The short version: this store
exists so a wiped phone can be made whole, and the only way to guarantee that is to hand back the
bytes the device wrote. `buildSession()` produces a specific object with a deliberate key order;
`logMeta` exists precisely so a write "never drops a key it didn't understand"; schema 4 added
`planId` and schema 5 added `rx` without touching a single stored session. Shredding that into rows
makes every restore a reconstruction and makes every future additive key a column migration.

The engines read whole sessions anyway — there is no server-side query a join would enable that the
client does not already do locally and offline. And at ~30 sessions per six weeks for one person, a
join is solving a problem that does not exist.

What is **not** given up: `client_id`, `local_date`, `day_id`, `plan_id` and `date_basis` are real
typed, indexed columns. They are **derived from the document by trigger**, never sent separately, so
they cannot drift from it. The client cannot store a doc dated the 11th under a `local_date` of the
12th. `local_date` is a `date`, never a coerced `timestamptz` (B-03, CLAUDE.md §3.4).

### What the server refuses

`phat_validate_session_doc` mirrors `logic.js` exactly: `w` in 0–500 (0 is legal — a rack chin,
B-21), whole `r` in 1–100, `NUM_W` / `NUM_R` for numeric strings, `YYYY-MM-DD` for dates, a
non-empty `id` and `dayId`. A malformed value is **rejected with a message naming the entry**, never
coerced, never rounded, never skipped. `"7.5.0"` cannot cross the network any more than it can reach
the local save path (B-02).

Rejections carry SQLSTATE **`23514`** so a sync client can tell *"this row will never be acceptable,
say so out loud"* from a network error, which it must retry. That distinction is the difference
between a visible problem and a silent one.

### Why nothing here can destroy a number

- Sessions and bodyweight are **soft-deleted** (`deleted_at`); the app never issues a hard delete.
- Before any update changes a document, an `after` trigger copies the **previous** document into
  `conflicts`. This is enforced in the database, not in client code, so a buggy sync layer cannot
  skip it.
- `conflicts` is append-only from the app: `select` and `insert`, no `update`, no `delete`. The bug
  that destroys a row must not also be able to destroy the evidence. This is a deliberate deviation
  from "four policies on every table" and is flagged as one in `rls.sql`.
- `v_session_counts` computes entry and set counts from the stored document, so after a push you can
  prove the row that came back holds the same number of sets as the one you sent.

---

## 6. Sync — the proposal, and the decision taken

**Decided 2026-09-11 (work order E-3): §6.1 is adopted.** Backup and restore shipped; two-way sync
did not. The draft and the preferences do not back up. Everything below §6.1 is kept as the record
of what two-way sync would have to answer before it is built, and none of it is answered.

### 6.1 The recommendation, first

**Ship backup and restore. Do not ship two-way sync.**

Push-only: the device writes to Supabase, the server never writes back except when Chady explicitly
taps Restore. One device, one user, one writer — and every conflict case in §6.3 disappears except
the one the unique key already handles. It is a fraction of the work, it delivers the entire value
(a wiped or stolen phone does not cost six weeks of training), and it cannot corrupt history because
nothing remote ever overwrites anything local.

Two-way sync is worth building the day a second device exists. Today there is one phone. Building
conflict resolution for a scenario that has never occurred, on a log that currently has zero
sessions in it, is the fourth tool for a programme with no logged sessions.

I disagree with building sync now because the risk it introduces is unbounded and the problem it
solves is hypothetical. What I'd do instead: backup + restore, and revisit at the second device.
The risk in the sync approach is that the first time it goes wrong is also the first time there is
six weeks of real training in there to lose.

### 6.2 What would trigger a sync

- After `finish()` commits **locally** — fire-and-forget, never awaited, never blocking the toast.
- On `online` and on `visibilitychange → visible`, if there is anything unpushed.
- On boot, after the local store has loaded and rendered.
- A manual **Back up now** in Settings, showing a real outcome — last successful backup, count
  pushed, and a visible failure state that does not look like success (the B-16 lesson).

Never: before a local write, during a set, or on any path a logging tap waits on. A sync failure is
reported as a sync failure, never as a failure to log.

### 6.3 The conflict cases, named and NOT resolved

Each of these needs a ruling from Chady and the PM before a line of sync code is written. `conflicts`
means none of them can destroy a set — but "the losing version is in an archive table" is not the
same as "the app shows him the right number", and the second one is what matters.

1. **Local only.** Session on the phone, not on the server. Push. Idempotent on
   `(user_id, client_id)`; a retry after a timeout that actually succeeded updates one row rather
   than creating a second. *No ruling needed — this one is solved.*
2. **Server only.** A session the server has and this device does not. Is that "another device
   logged it, pull it" or "this device deleted it, push the deletion"? Indistinguishable without a
   tombstone the local store does not currently keep. **Unruled.**
3. **Both sides, identical document.** No-op. *Solved.*
4. **Both sides, different document, same `client_id`.** The real conflict. Sub-cases that are not
   the same problem and should not get the same answer:
   - one side is a strict superset (a set was added offline) — mergeable in principle;
   - the same set holds different numbers on each side (a B-05 correction on one device) —
     genuinely ambiguous, and picking one silently destroys a correction or a set;
   - one side is soft-deleted and the other is edited — delete-versus-edit, the classic, and the
     one where "last write wins" is most obviously wrong.
5. **Same workout, two `client_id`s.** He logs Monday's session on the phone with no signal, and
   also on a second device. The ids are two different `Date.now()` values, so the unique key does
   not fire and the server ends up with **two sessions for one workout**, same `local_date`, same
   `day_id`. This is the case most likely to silently corrupt history — it does not look like an
   error anywhere, it just doubles the volume the engines read, which moves the verdict, the stall
   report and the deload trigger. `(user_id, local_date, day_id)` is *not* a safe unique key either
   (two real sessions in one day is legal). **Unruled, and the most important one.**
6. **Bodyweight, same date, two values.** The local rule is one row per date and a second entry on
   the same day updates. Remotely, two devices give two numbers for one date and the primary key
   forces a choice. Which one? The heavier? The later? Ask? **Unruled.**
7. **`user_state` — counters and stamps, not documents.** `reintro` is a per-day counter,
   `lastReintroDate` a per-day stamp, `deload` a state machine, `calChangedAt` a 7-day hold. Last
   write wins on the whole blob silently discards a reintroduction accepted on the other device, or
   restarts a calorie hold. `acceptReintro` is already idempotent per day per date, so a field-level
   merge is *plausible* — but which field beats which is a **coaching** question and belongs to
   `strength-coach`, not to me. **Unruled.**
8. **Clock skew.** `client_updated_at` is a device clock. Two devices twenty minutes apart resolve
   "last write" wrongly and confidently. Server arrival order is not "last write" either — the
   offline phone arrives last precisely because it was offline, and its data is often the *older*
   version. **Unruled.**
9. **A known gap in the data, today.** The stored session object carries **no `updatedAt`**. There
   is no field on disk that says when a session was last changed, so there is nothing honest to feed
   a last-write-wins rule. `sessions.client_updated_at` currently defaults to the server clock at
   first push, which is a *placeholder, not an answer*. Fixing it means adding `updatedAt` to the
   session shape — additive, schema 6, its own migration, its own work order. **That must land
   before two-way sync, not alongside it.**

### 6.4 The one thing I will state as a position

Last-write-wins on a training log destroys a real set. CLAUDE.md §3.3 makes that the only P0 class
in the project. So: the archive table is mandatory (built), and any resolution rule that discards a
document must be a rule Chady has read and agreed to, not a default I chose because it was the
conventional one.

---

## 7. What QA should test

The pure half — `backupPayload`, `restorePayload`, `validateSessionDoc`, `validateBwDoc`,
`backupSig`, `agoText` — is testable from `tests.html` over `file://` with no network, and QA owes
it a section. The rest needs a browser and the live project; the E-3 verification run did each of
these once with Playwright against `http://localhost` and the results are in the E-3 report and
`docs/decisions.md`:

- **Idempotence.** Push the same session twice → one row. Push it fifty times → one row, and
  `conflicts` stays empty because the document never changed.
- **Idempotence under partial failure.** Push, kill the network mid-response, retry → one row.
- **Two bodyweight rows for one date** are impossible: the second insert must update, and the
  previous value must appear in `conflicts`.
- **Rejection, not coercion.** Push a doc containing `"w": "7.5.0"` → `23514`, message names the
  entry, nothing is written, and the *rest of the session* is not written either (a partial session
  is the B-02 failure in new clothes).
- **0 kg survives.** `{"w":0,"r":10}` round-trips as `0`, not dropped, not `null` (B-21).
- **Local date, late at night.** A session logged at 23:58 local in a UTC+11 zone stores the local
  calendar day, and comes back as that day.
- **Derived columns cannot be lied to.** Attempt an insert supplying `local_date` that disagrees
  with `doc->>'date'` → the trigger overwrites it from the doc. Same for `client_id` and `day_id`.
- **Round trip is byte-identical.** Export locally, push, pull into an empty store, export again →
  the two exports match. This is the only test that actually proves backup works.
- **Anon sees nothing**, from a real browser with the anon key and no session: `select` → `[]`,
  `insert` → error.
- **A signed-in user cannot widen their filter** to another `user_id`.
- **Offline logging is unaffected.** Aeroplane mode, log a full session, save — the toast, the
  timing and the local store are identical to the online path. This is the acceptance test that
  matters more than all the others.

**The edge cases I am least sure about**, stated honestly:

- `client_id` is `String(Date.now())`. Two devices *can* mint the same value, and a phone whose
  clock is corrected backwards can mint one that already exists. Unlikely; not impossible. The
  consequence is case 4 above — one session overwriting another — and the mitigation is that the
  loser lands in `conflicts` rather than being destroyed. A random suffix on new session ids would
  close it properly and is a client change I have not made.
- Generated columns on `user_state` are computed from `log_meta` by Postgres. If `includeCut` is
  ever stored as the *string* `"false"` rather than the boolean, `include_cut` reads `false`
  correctly — but if it is stored as `"no"`, the cast throws and the whole write fails. That is the
  right failure (loud), but I have not proven the local store cannot produce it.
- The `after update` archive trigger inserts into `conflicts` under the caller's own privileges. I
  am confident it is correct; I have not run it against a real Supabase instance.
- Nothing in these files has been executed. They are written against the Postgres and Supabase
  documentation and this codebase's shapes, not against a live project. **First application should
  be watched, statement by statement.**

---

## 8. What is still owed by Chady

Items 1–5 of the original list are answered: the project exists, the key is in `sync.js`, the local
log was empty so there was nothing to import, the draft and preferences do not back up, and it is
backup-only. What remains:

1. **Create your account** from Settings → Backup → `CREATE ACCOUNT` on the phone, once the build
   is deployed. Then **disable sign-ups** in the dashboard (§4) and say when it is done.
2. **Delete the throwaway account** `test+e3@example.com` (§4) after yours exists.
3. **Restore is the only path that shrinks the local log**, and only behind a typed `REPLACE` with
   an export and a kept copy in front of it. If you would rather it did not exist at all until a
   phone is actually lost, say so — it is one button and one function.

The standing diagnosis still stands: this is a backup for a log with zero real sessions in it. It is
worth having before there is something to lose. It protects nothing until there is training in it.
